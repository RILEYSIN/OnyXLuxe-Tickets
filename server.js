"use strict";

const {
  createHash,
  randomUUID,
  timingSafeEqual,
} = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const ROOT = __dirname;
const EVENTS = require("./events.js");
const MAX_REQUEST_BYTES = 16 * 1024;
const PUBLIC_EXTENSIONS = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const contentType = request.headers["content-type"]?.split(";", 1)[0].trim();
  if (contentType !== "application/json") {
    throw new RequestError(415, "Send the form as JSON.");
  }

  const contentLength = Number(request.headers["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new RequestError(413, "The request is too large.");
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_REQUEST_BYTES) {
      throw new RequestError(413, "The request is too large.");
    }
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "The request body must be valid JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestError(400, "The request body must be a JSON object.");
  }

  return body;
}

async function readRawBody(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_REQUEST_BYTES) {
      throw new RequestError(413, "The request is too large.");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function createAppServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const appOriginValue =
    options.appOrigin ?? process.env.APP_ORIGIN ?? `http://localhost:${port}`;
  const appOrigin = new URL(appOriginValue).origin;
  const databasePath =
    options.databasePath ??
    process.env.DATABASE_PATH ??
    path.join(ROOT, "data", "accounts.sqlite");
  const flutterwaveSecretKey =
    options.flutterwaveSecretKey ?? process.env.FLW_SECRET_KEY;
  const flutterwaveWebhookSecret =
    options.flutterwaveWebhookSecret ?? process.env.FLW_WEBHOOK_SECRET_HASH;
  const paymentsEnabled =
    options.paymentsEnabled ?? process.env.FLW_PAYMENTS_ENABLED === "true";
  const flutterwaveFetch = options.flutterwaveFetch ?? globalThis.fetch;

  if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN) {
    throw new Error("APP_ORIGIN must be set when running in production.");
  }

  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
  }

  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS payments (
      tx_ref TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      transaction_id TEXT,
      flw_ref TEXT,
      transfer_bank TEXT,
      transfer_account TEXT,
      transfer_amount TEXT,
      account_expiration TEXT,
      transfer_reference TEXT,
      transfer_note TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  const insertPayment = database.prepare(
    "INSERT INTO payments (tx_ref, event_id, quantity, amount, status, created_at) " +
      "VALUES (?, ?, ?, ?, 'initiating', ?)"
  );
  const findPaymentDetails = database.prepare(
    "SELECT tx_ref, amount, status, transfer_bank, transfer_account, " +
      "transfer_amount, account_expiration, transfer_reference, transfer_note " +
      "FROM payments WHERE tx_ref = ?"
  );
  const updatePaymentDetails = database.prepare(
    "UPDATE payments SET status = 'pending', transfer_bank = ?, transfer_account = ?, " +
      "transfer_amount = ?, account_expiration = ?, transfer_reference = ?, " +
      "transfer_note = ? WHERE tx_ref = ? AND status = 'initiating'"
  );
  const failInitiatingPayment = database.prepare(
    "UPDATE payments SET status = 'failed' WHERE tx_ref = ? AND status = 'initiating'"
  );
  const findPaymentForWebhook = database.prepare(
    "SELECT tx_ref, amount, status FROM payments WHERE tx_ref = ?"
  );
  const updateVerifiedPayment = database.prepare(
    "UPDATE payments SET status = ?, transaction_id = ?, flw_ref = ? " +
      "WHERE tx_ref = ? AND status != 'successful'"
  );

  function requireSameOrigin(request) {
    let requestOrigin;
    try {
      requestOrigin = new URL(request.headers.origin).origin;
    } catch {
      throw new RequestError(403, "This request was blocked.");
    }

    if (requestOrigin !== appOrigin) {
      throw new RequestError(403, "This request was blocked.");
    }
  }

  function isValidWebhookSignature(signature) {
    if (!flutterwaveWebhookSecret || !signature) {
      return false;
    }
    const supplied = Buffer.from(signature);
    const expected = Buffer.from(flutterwaveWebhookSecret);
    return (
      supplied.length === expected.length &&
      timingSafeEqual(supplied, expected)
    );
  }

  async function verifyFlutterwaveTransaction(transactionId) {
    if (!/^\d+$/.test(String(transactionId))) {
      throw new Error("Flutterwave webhook contained an invalid transaction ID.");
    }

    const response = await flutterwaveFetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${flutterwaveSecretKey}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("Flutterwave returned an invalid transaction response.");
    }
    if (!response.ok || result.status !== "success" || !result.data) {
      throw new Error("Flutterwave could not verify the bank transfer.");
    }
    return result.data;
  }

  async function handleBankTransferWebhook(request, response) {
    if (!flutterwaveWebhookSecret) {
      sendJson(response, 503, {
        error: "Bank transfer confirmation is not configured.",
      });
      return;
    }
    if (!isValidWebhookSignature(request.headers["verif-hash"])) {
      sendJson(response, 401, { error: "Invalid webhook signature." });
      return;
    }

    const rawBody = await readRawBody(request);
    let payload;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new RequestError(400, "The webhook body must be valid JSON.");
    }

    const transaction = payload?.data;
    if (
      payload?.event !== "charge.completed" ||
      transaction?.payment_type !== "bank_transfer" ||
      typeof transaction.tx_ref !== "string"
    ) {
      sendJson(response, 200, { ok: true });
      return;
    }

    const payment = findPaymentForWebhook.get(transaction.tx_ref);
    if (!payment || payment.status === "successful") {
      sendJson(response, 200, { ok: true });
      return;
    }

    const verified = await verifyFlutterwaveTransaction(transaction.id);
    const matchesOrder =
      verified.tx_ref === payment.tx_ref &&
      verified.currency === "NGN" &&
      Number(verified.amount) >= payment.amount &&
      verified.payment_type === "bank_transfer";
    if (!matchesOrder) {
      console.error("Flutterwave transaction did not match bank transfer order:", {
        txRef: payment.tx_ref,
        transactionId: String(verified.id),
      });
      sendJson(response, 200, { ok: true });
      return;
    }

    const verifiedStatus =
      verified.status === "successful"
        ? "successful"
        : verified.status === "failed"
          ? "failed"
          : "pending";
    updateVerifiedPayment.run(
      verifiedStatus,
      String(verified.id),
      typeof verified.flw_ref === "string" ? verified.flw_ref : null,
      payment.tx_ref
    );
    sendJson(response, 200, { ok: true });
  }

  async function handleApi(request, response, requestUrl) {
    const route = `${request.method} ${requestUrl.pathname}`;

    if (route === "POST /api/webhooks/flutterwave") {
      await handleBankTransferWebhook(request, response);
      return;
    }

    if (route === "POST /api/payments/bank-transfer") {
      requireSameOrigin(request);
      if (!paymentsEnabled || !flutterwaveSecretKey) {
        throw new RequestError(
          503,
          "Bank transfer checkout is not enabled. Please contact OnyXLuxe support."
        );
      }

      const body = await readJson(request);
      const event =
        typeof body.eventId === "string"
          ? EVENTS.find((item) => item.id === body.eventId)
          : null;
      const quantity = Number(body.quantity);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const phone =
        typeof body.phone === "string" ? body.phone.trim() : "";

      if (!event) {
        throw new RequestError(400, "Choose a valid event.");
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new RequestError(400, "Choose between 1 and 10 tickets.");
      }
      if (!name || name.length > 100) {
        throw new RequestError(400, "Enter a valid full name.");
      }
      if (
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        throw new RequestError(400, "Enter a valid email address.");
      }
      const phoneDigits = phone.replace(/\D/g, "");
      if (
        !/^\+?[\d\s()-]{10,20}$/.test(phone) ||
        phoneDigits.length < 10 ||
        phoneDigits.length > 15
      ) {
        throw new RequestError(400, "Enter a valid phone number.");
      }

      const amount = event.price * quantity;
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error("The selected event has an invalid ticket price.");
      }

      const txRef = `onyxluxe-${randomUUID()}`;
      insertPayment.run(txRef, event.id, quantity, amount, Date.now());

      let flwResponse;
      try {
        flwResponse = await flutterwaveFetch(
          "https://api.flutterwave.com/v3/charges?type=bank_transfer",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${flutterwaveSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tx_ref: txRef,
              amount: String(amount),
              currency: "NGN",
              email,
              fullname: name,
              phone_number: phone,
              narration: event.title,
              is_permanent: false,
              bank_code: "090567",
              bank_transfer_options: { expires: 3600 },
            }),
            signal: AbortSignal.timeout(15000),
          }
        );
      } catch (error) {
        failInitiatingPayment.run(txRef);
        console.error("Flutterwave bank transfer request failed:", error);
        throw new RequestError(
          502,
          "Could not reach Flutterwave. Please try again."
        );
      }

      let result;
      try {
        result = await flwResponse.json();
      } catch {
        failInitiatingPayment.run(txRef);
        throw new RequestError(
          502,
          "Flutterwave returned an invalid response. Please try again."
        );
      }

      const authorization = result?.meta?.authorization;
      const transferAmount = Number(
        authorization?.transfer_amount ?? amount
      );
      if (
        !flwResponse.ok ||
        result.status !== "success" ||
        typeof authorization?.transfer_account !== "string" ||
        !/^\d{6,20}$/.test(authorization.transfer_account) ||
        typeof authorization?.transfer_bank !== "string" ||
        !Number.isFinite(transferAmount) ||
        transferAmount < amount
      ) {
        failInitiatingPayment.run(txRef);
        console.error("Flutterwave rejected bank transfer charge:", {
          httpStatus: flwResponse.status,
          message:
            typeof result?.message === "string" ? result.message : "Unknown error",
        });
        throw new RequestError(
          502,
          "Flutterwave could not create bank transfer details. Please try again."
        );
      }

      updatePaymentDetails.run(
        authorization.transfer_bank,
        authorization.transfer_account,
        String(transferAmount),
        authorization.account_expiration ?? null,
        authorization.transfer_reference ?? null,
        authorization.transfer_note ?? null,
        txRef
      );
      sendJson(response, 201, {
        payment: {
          txRef,
          amount,
          currency: "NGN",
          status: "pending",
          bank: authorization.transfer_bank,
          accountNumber: authorization.transfer_account,
          transferAmount: String(transferAmount),
          expiresAt: authorization.account_expiration ?? null,
          transferReference: authorization.transfer_reference ?? null,
          note: authorization.transfer_note ?? null,
        },
      });
      return;
    }

    const paymentStatusMatch = requestUrl.pathname.match(
      /^\/api\/payments\/(onyxluxe-[\da-f-]{36})$/
    );
    if (request.method === "GET" && paymentStatusMatch) {
      const payment = findPaymentDetails.get(paymentStatusMatch[1]);
      if (!payment) {
        throw new RequestError(404, "Bank transfer not found.");
      }
      sendJson(response, 200, {
        payment: {
          txRef: payment.tx_ref,
          amount: payment.amount,
          status: payment.status,
          bank: payment.transfer_bank,
          accountNumber: payment.transfer_account,
          transferAmount: payment.transfer_amount,
          expiresAt: payment.account_expiration,
          transferReference: payment.transfer_reference,
          note: payment.transfer_note,
        },
      });
      return;
    }

    sendJson(response, 404, { error: "Account service endpoint not found." });
  }

  function serveStatic(request, response, requestUrl) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    let relativePath;
    try {
      relativePath = decodeURIComponent(requestUrl.pathname).slice(1);
    } catch {
      response.writeHead(400);
      response.end("Bad request.");
      return;
    }

    if (!relativePath) {
      relativePath = "index.html";
    }

    if (
      relativePath.includes("/") ||
      relativePath.includes("\\") ||
      relativePath.startsWith(".") ||
      relativePath === "server.js"
    ) {
      response.writeHead(404);
      response.end("Not found.");
      return;
    }

    const extension = path.extname(relativePath).toLowerCase();
    const contentType = PUBLIC_EXTENSIONS.get(extension);
    const filePath = path.resolve(ROOT, relativePath);
    if (
      !contentType ||
      !filePath.startsWith(`${ROOT}${path.sep}`) ||
      !fs.existsSync(filePath) ||
      !fs.statSync(filePath).isFile()
    ) {
      response.writeHead(404);
      response.end("Not found.");
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(filePath).pipe(response);
  }

  const server = http.createServer(async (request, response) => {
    let requestUrl;
    try {
      requestUrl = new URL(request.url, appOrigin);
    } catch {
      response.writeHead(400);
      response.end("Bad request.");
      return;
    }

    if (requestUrl.pathname.startsWith("/api/")) {
      try {
        await handleApi(request, response, requestUrl);
      } catch (error) {
        if (error instanceof RequestError) {
          sendJson(response, error.status, { error: error.message });
          return;
        }

        console.error("Application API request failed:", error);
        sendJson(response, 500, {
          error: "The payment service could not complete that request.",
        });
      }
      return;
    }

    serveStatic(request, response, requestUrl);
  });

  return {
    server,
    close() {
      database.close();
    },
  };
}

if (require.main === module) {
  const app = createAppServer();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";
  app.server.listen(port, host, () => {
    const displayHost = host === "0.0.0.0" || host === "::" ? "localhost" : host;
    console.log(`OnyXLuxe is running at http://${displayHost}:${port}`);
  });
  app.server.on("close", app.close);
}

module.exports = { createAppServer };

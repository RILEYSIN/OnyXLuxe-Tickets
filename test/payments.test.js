"use strict";

const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createAppServer } = require("../server.js");

async function getAvailablePort() {
  const probe = net.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address();
  await new Promise((resolve, reject) => {
    probe.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

async function startApp(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "onyxluxe-auth-"));
  const port = await getAvailablePort();
  const origin = `http://127.0.0.1:${port}`;
  const app = createAppServer({
    appOrigin: origin,
    databasePath: path.join(directory, "accounts.sqlite"),
    ...options,
  });
  app.server.listen(port, "127.0.0.1");
  await once(app.server, "listening");

  t.after(async () => {
    await new Promise((resolve, reject) => {
      app.server.close((error) => (error ? reject(error) : resolve()));
    });
    app.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  async function request(route, { method = "GET", body } = {}) {
    const headers = { Origin: origin };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    return fetch(`${origin}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  return { request, origin };
}

test("server serves the website without exposing removed account APIs", async (t) => {
  const app = await startApp(t);
  const page = await app.request("/signup.html");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Create your account/);
  assert.equal((await app.request("/api/session")).status, 404);
  assert.equal(
    (await app.request("/api/signup", { method: "POST", body: {} })).status,
    404
  );
  assert.equal((await app.request("/server.js")).status, 404);
  assert.equal((await app.request("/test/payments.test.js")).status, 404);
});

test("bank transfer uses the server event price and only confirms verified payments", async (t) => {
  const flutterwaveRequests = [];
  const app = await startApp(t, {
    paymentsEnabled: true,
    flutterwaveSecretKey: "test-secret",
    flutterwaveWebhookSecret: "webhook-secret",
    flutterwaveFetch: async (url, options) => {
      flutterwaveRequests.push({ url, options });
      if (url.endsWith("/charges?type=bank_transfer")) {
        return new Response(
          JSON.stringify({
            status: "success",
            meta: {
              authorization: {
                transfer_account: "9755152912",
                transfer_bank: "Flutterwave MFB",
                transfer_amount: "10000",
                account_expiration: "2026-11-02 12:00:00",
                transfer_reference: "FLW-TRANSFER-REF",
                transfer_note: "Transfer for OnyXLuxe",
              },
            },
          }),
          { status: 200 }
        );
      }

      assert.match(url, /\/v3\/transactions\/12345\/verify$/);
      return new Response(
        JSON.stringify({
          status: "success",
          data: {
            id: 12345,
            tx_ref: JSON.parse(flutterwaveRequests[0].options.body).tx_ref,
            amount: 10000,
            currency: "NGN",
            payment_type: "bank_transfer",
            status: "successful",
            flw_ref: "FLW-SESSION-REF",
          },
        }),
        { status: 200 }
      );
    },
  });

  const response = await app.request("/api/payments/bank-transfer", {
    method: "POST",
    body: {
      eventId: "concert-night-live",
      quantity: 2,
      name: "Ada Okafor",
      email: "ada@example.com",
      phone: "+2348012345678",
      amount: 1,
    },
  });
  assert.equal(response.status, 201);
  const { payment } = await response.json();
  assert.equal(payment.amount, 10000);
  assert.equal(payment.status, "pending");
  assert.equal(payment.bank, "Flutterwave MFB");
  assert.equal(payment.accountNumber, "9755152912");

  const chargePayload = JSON.parse(flutterwaveRequests[0].options.body);
  assert.equal(chargePayload.amount, "10000");
  assert.equal(chargePayload.currency, "NGN");
  assert.equal(chargePayload.bank_code, "090567");
  assert.equal(chargePayload.is_permanent, false);
  assert.equal(
    flutterwaveRequests[0].options.headers.Authorization,
    "Bearer test-secret"
  );

  const webhook = {
    event: "charge.completed",
    data: {
      id: 12345,
      tx_ref: payment.txRef,
      payment_type: "bank_transfer",
    },
  };
  const webhookResponse = await app.request("/api/webhooks/flutterwave", {
    method: "POST",
    body: webhook,
  });
  assert.equal(webhookResponse.status, 401);

  const signedWebhookResponse = await fetch(
    `${app.origin}/api/webhooks/flutterwave`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "verif-hash": "webhook-secret",
      },
      body: JSON.stringify(webhook),
    }
  );
  assert.equal(signedWebhookResponse.status, 200);

  const statusResponse = await app.request(`/api/payments/${payment.txRef}`);
  const updatedPayment = (await statusResponse.json()).payment;
  assert.equal(updatedPayment.status, "successful");
  assert.equal(updatedPayment.transferReference, "FLW-TRANSFER-REF");
  assert.equal(flutterwaveRequests.length, 2);
});

test("bank transfer rejects when disabled and ignores mismatched verified charges", async (t) => {
  const disabledApp = await startApp(t);
  const disabledResponse = await disabledApp.request(
    "/api/payments/bank-transfer",
    {
      method: "POST",
      body: {
        eventId: "concert-night-live",
        quantity: 1,
        name: "Ada Okafor",
        email: "ada@example.com",
        phone: "+2348012345678",
      },
    }
  );
  assert.equal(disabledResponse.status, 503);

  const app = await startApp(t, {
    paymentsEnabled: true,
    flutterwaveSecretKey: "test-secret",
    flutterwaveWebhookSecret: "webhook-secret",
    flutterwaveFetch: async (url) => {
      if (url.endsWith("/charges?type=bank_transfer")) {
        return new Response(
          JSON.stringify({
            status: "success",
            meta: {
              authorization: {
                transfer_account: "9755152912",
                transfer_bank: "Flutterwave MFB",
                transfer_amount: "5000",
              },
            },
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          status: "success",
          data: {
            id: 12345,
            tx_ref: "not-the-order",
            amount: 5000,
            currency: "NGN",
            payment_type: "bank_transfer",
            status: "successful",
          },
        }),
        { status: 200 }
      );
    },
  });
  const createResponse = await app.request("/api/payments/bank-transfer", {
    method: "POST",
    body: {
      eventId: "concert-night-live",
      quantity: 1,
      name: "Ada Okafor",
      email: "ada@example.com",
      phone: "+2348012345678",
    },
  });
  const { payment } = await createResponse.json();
  const webhookResponse = await fetch(
    `${app.origin}/api/webhooks/flutterwave`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "verif-hash": "webhook-secret",
      },
      body: JSON.stringify({
        event: "charge.completed",
        data: {
          id: 12345,
          tx_ref: payment.txRef,
          payment_type: "bank_transfer",
        },
      }),
    }
  );
  assert.equal(webhookResponse.status, 200);

  const statusResponse = await app.request(`/api/payments/${payment.txRef}`);
  assert.equal((await statusResponse.json()).payment.status, "pending");
});

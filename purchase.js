document.addEventListener("DOMContentLoaded", async function () {
  const eventId = new URLSearchParams(window.location.search).get("event");
  const eventDetails = window.EVENTS.find((item) => item.id === eventId);
  const eventError = document.getElementById("event-error");
  const checkoutContent = document.getElementById("checkout-content");

  if (!eventDetails) {
    eventError.hidden = false;
    eventError.textContent =
      "We couldn't find that event. Go back to the events page and choose an event to continue.";
    return;
  }

  checkoutContent.hidden = false;
  const image = document.getElementById("event-image");
  image.src = eventDetails.image;
  image.alt = eventDetails.imageAlt;
  document.getElementById("event-title").textContent = eventDetails.title;
  document.getElementById("event-description").textContent =
    eventDetails.description;
  document.getElementById("event-date").textContent = eventDetails.date;
  document.getElementById("event-time").textContent = eventDetails.time;
  document.getElementById("event-location").textContent = eventDetails.location;
  document.getElementById("event-host").textContent = eventDetails.host;
  document.getElementById("unit-price").textContent = window.formatNaira(
    eventDetails.price
  );

  const form = document.querySelector(".purchase-form");
  const quantityInput = document.getElementById("quantity");
  const phoneInput = document.getElementById("phone");
  const checkoutMessage = document.getElementById("checkout-message");
  const totalPrice = document.getElementById("total-price");
  const paymentButton = form.querySelector('button[type="submit"]');
  const paymentMethodInputs = form.querySelectorAll(
    'input[name="payment-method"]'
  );
  const bankTransferDetails = document.getElementById(
    "bank-transfer-details"
  );
  const transferStatus = document.getElementById("transfer-status");
  let activePaymentReference = "";
  let paymentPollCount = 0;
  const MAX_PAYMENT_POLL_COUNT = 120;
  const PAYMENT_POLL_INTERVAL_MS = 15000;

  function updateTotal() {
    const quantity = Number.parseInt(quantityInput.value, 10);
    totalPrice.textContent =
      Number.isInteger(quantity) && quantity > 0
        ? window.formatNaira(eventDetails.price * quantity)
        : "Enter a valid quantity";
  }

  function getSelectedPaymentMethod() {
    return form.querySelector(
      'input[name="payment-method"]:checked'
    ).value;
  }

  function formatTransferAmount(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  }

  function updatePaymentMethod() {
    const bankTransferSelected =
      getSelectedPaymentMethod() === "bank-transfer";
    form.querySelector(".payment-note").textContent = bankTransferSelected
      ? "Flutterwave will provide temporary bank account details for your transfer. Use the exact amount shown; your payment is not confirmed until Flutterwave verifies it."
      : "You’ll continue to Flutterwave to pay using a payment link. This site does not handle card details or confirm payments.";
    paymentButton.innerHTML = bankTransferSelected
      ? 'Get bank transfer details <span aria-hidden="true">&rarr;</span>'
      : 'Proceed to payment <span aria-hidden="true">&rarr;</span>';
  }

  function showPaymentDetails(payment) {
    activePaymentReference = payment.txRef;
    document.getElementById("transfer-bank").textContent = payment.bank;
    document.getElementById("transfer-account").textContent =
      payment.accountNumber;
    document.getElementById("transfer-amount").textContent =
      formatTransferAmount(payment.transferAmount);
    document.getElementById("transfer-reference").textContent =
      payment.transferReference || payment.txRef;
    document.getElementById("transfer-expiration").textContent =
      payment.expiresAt || "See Flutterwave bank transfer instructions";
    document.getElementById("transfer-note").textContent = payment.note || "";
    bankTransferDetails.hidden = false;
    bankTransferDetails.scrollIntoView({ behavior: "smooth", block: "nearest" });

    if (payment.status === "successful") {
      transferStatus.textContent =
        "Flutterwave confirmed your payment. Contact OnyXLuxe support with your payment reference to arrange ticket delivery.";
      paymentButton.disabled = true;
      return;
    }

    if (payment.status === "failed") {
      transferStatus.textContent =
        "Flutterwave could not confirm this transfer. Contact support before trying again.";
      paymentButton.disabled = false;
      return;
    }

    transferStatus.textContent =
      "Waiting for Flutterwave to confirm your transfer. Keep this page open or return using this page link.";
    paymentButton.disabled = true;
    paymentPollCount = 0;
    schedulePaymentStatusCheck();
  }

  function schedulePaymentStatusCheck() {
    if (
      !activePaymentReference ||
      paymentPollCount >= MAX_PAYMENT_POLL_COUNT
    ) {
      transferStatus.textContent =
        "Your transfer is still awaiting confirmation. Contact support with your payment reference if you have already paid.";
      return;
    }

    window.setTimeout(
      checkPaymentStatus,
      PAYMENT_POLL_INTERVAL_MS
    );
  }

  async function checkPaymentStatus() {
    paymentPollCount += 1;
    try {
      const response = await fetch(
        `/api/payments/${encodeURIComponent(activePaymentReference)}`,
        { headers: { Accept: "application/json" } }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not check payment status.");
      }

      if (result.payment.status !== "pending") {
        showPaymentDetails(result.payment);
        return;
      }

      schedulePaymentStatusCheck();
    } catch (error) {
      transferStatus.textContent =
        error instanceof Error
          ? `${error.message} We’ll retry automatically.`
          : "Could not check payment status. We’ll retry automatically.";
      schedulePaymentStatusCheck();
    }
  }

  async function startBankTransfer(quantity) {
    paymentButton.disabled = true;
    paymentButton.textContent = "Requesting bank details…";
    try {
      const response = await fetch("/api/payments/bank-transfer", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventDetails.id,
          quantity,
          name: document.getElementById("name").value.trim(),
          email: document.getElementById("email").value.trim(),
          phone: phoneInput.value.trim(),
        }),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("The bank transfer service returned an invalid response.");
      }
      if (!response.ok) {
        throw new Error(result.error || "Could not start your bank transfer.");
      }

      checkoutMessage.textContent = "";
      const payment = result.payment;
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("payment", payment.txRef);
      window.history.replaceState(null, "", currentUrl);
      showPaymentDetails(payment);
    } catch (error) {
      checkoutMessage.textContent =
        error instanceof Error
          ? error.message
          : "Could not reach the bank transfer service. Please try again.";
      paymentButton.disabled = false;
      updatePaymentMethod();
    }
  }

  async function restoreBankTransfer(paymentReference) {
    const response = await fetch(
      `/api/payments/${encodeURIComponent(paymentReference)}`,
      { headers: { Accept: "application/json" } }
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not restore your bank transfer.");
    }
    showPaymentDetails(result.payment);
  }

  quantityInput.addEventListener("input", updateTotal);
  phoneInput.addEventListener("input", function () {
    phoneInput.setCustomValidity("");
  });
  paymentMethodInputs.forEach((input) => {
    input.addEventListener("change", updatePaymentMethod);
  });
  updateTotal();
  updatePaymentMethod();

  form.addEventListener("submit", async function (submitEvent) {
    submitEvent.preventDefault();
    checkoutMessage.textContent = "";

    const phoneDigits = phoneInput.value.replace(/\D/g, "");
    const validPhone =
      /^\+?[\d\s()-]{10,20}$/.test(phoneInput.value.trim()) &&
      phoneDigits.length >= 10 &&
      phoneDigits.length <= 15;
    phoneInput.setCustomValidity(
      validPhone ? "" : "Enter a valid phone number with 10 to 15 digits."
    );
    if (!form.reportValidity()) {
      return;
    }

    const quantity = Number.parseInt(quantityInput.value, 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      checkoutMessage.textContent = "Choose between 1 and 10 tickets.";
      return;
    }

    if (getSelectedPaymentMethod() === "bank-transfer") {
      await startBankTransfer(quantity);
      return;
    }

    const paymentLink = eventDetails.paymentLinksByQuantity[quantity];
    if (!paymentLink) {
      checkoutMessage.textContent =
        `Flutterwave checkout for ${quantity} ticket${quantity === 1 ? "" : "s"} ` +
        "is not configured yet. Add the matching payment link in events.js.";
      return;
    }

    let checkoutUrl;
    try {
      checkoutUrl = new URL(paymentLink);
    } catch {
      checkoutMessage.textContent =
        "The Flutterwave payment link for this ticket quantity is invalid.";
      return;
    }

    if (
      checkoutUrl.protocol !== "https:" ||
      (checkoutUrl.hostname !== "flutterwave.com" &&
        !checkoutUrl.hostname.endsWith(".flutterwave.com"))
    ) {
      checkoutMessage.textContent =
        "The payment link must be a secure Flutterwave URL.";
      return;
    }

    const booking = {
      eventId: eventDetails.id,
      eventTitle: eventDetails.title,
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      quantity,
      total: eventDetails.price * quantity,
    };

    try {
      sessionStorage.setItem("onyxluxe_guest_booking", JSON.stringify(booking));
    } catch {
      checkoutMessage.textContent =
        "Your browser could not save this checkout. Allow session storage and try again.";
      return;
    }

    window.location.assign(checkoutUrl.href);
  });

  const paymentReference = new URLSearchParams(window.location.search).get(
    "payment"
  );
  if (paymentReference) {
    paymentButton.disabled = true;
    try {
      await restoreBankTransfer(paymentReference);
    } catch (error) {
      checkoutMessage.textContent =
        error instanceof Error
          ? error.message
          : "Could not restore your bank transfer.";
      paymentButton.disabled = false;
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
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

  function updateTotal() {
    const quantity = Number.parseInt(quantityInput.value, 10);
    totalPrice.textContent =
      Number.isInteger(quantity) && quantity > 0
        ? window.formatNaira(eventDetails.price * quantity)
        : "Enter a valid quantity";
  }

  quantityInput.addEventListener("input", updateTotal);
  phoneInput.addEventListener("input", function () {
    phoneInput.setCustomValidity("");
  });
  updateTotal();

  form.addEventListener("submit", function (submitEvent) {
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
});

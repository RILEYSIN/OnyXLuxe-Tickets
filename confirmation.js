document.addEventListener("DOMContentLoaded", function () {
  const summary = document.getElementById("booking-summary");

  try {
    const booking = JSON.parse(
      sessionStorage.getItem("onyxluxe_guest_booking") || "null"
    );
    if (!booking || typeof booking !== "object") {
      return;
    }

    const details = [
      booking.eventTitle,
      `${booking.quantity} ticket${booking.quantity === 1 ? "" : "s"}`,
      window.formatNaira ? window.formatNaira(booking.total) : "",
      booking.email,
    ].filter(Boolean);

    summary.textContent = `Checkout details: ${details.join(" · ")}. If payment was completed, check your email for Flutterwave's receipt.`;
    sessionStorage.removeItem("onyxluxe_guest_booking");
  } catch {
    summary.textContent =
      "If you just completed payment on Flutterwave, check your email for Flutterwave's receipt and any ticket delivery details.";
  }
});

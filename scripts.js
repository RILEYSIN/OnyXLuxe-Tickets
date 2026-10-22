document.addEventListener("DOMContentLoaded", function () {
  const previewDialog = document.querySelector(".event-preview-dialog");
  const closePreviewButton = previewDialog.querySelector(
    ".preview-close-button"
  );
  const previewBuyButton = previewDialog.querySelector(".preview-buy-button");
  let activeTicketCard = null;
  let countdownInterval = null;

  function getEventDetails(ticketCard) {
    const detailParagraphs = ticketCard.querySelectorAll(
      ".ticket-preview-details p"
    );
    const details = {};

    detailParagraphs.forEach((paragraph) => {
      const label = paragraph.querySelector("strong").textContent
        .replace(":", "")
        .toLowerCase();
      details[label] = paragraph.querySelector("strong").nextSibling.textContent
        .trim();
    });

    return details;
  }

  function updateCountdown(eventDate) {
    const countdownValue = previewDialog.querySelector(
      ".preview-countdown-value"
    );
    const targetDate = new Date(eventDate);
    const remaining = targetDate.getTime() - Date.now();

    if (Number.isNaN(targetDate.getTime())) {
      countdownValue.textContent = "Date to be confirmed";
      return;
    }

    if (remaining <= 0) {
      countdownValue.textContent = "This event has passed";
      return;
    }

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    countdownValue.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  function openPurchasePage(ticketCard) {
    const details = getEventDetails(ticketCard);
    const params = new URLSearchParams({
      title: ticketCard.querySelector(".ticket-title").textContent.trim(),
      desc: ticketCard.querySelector(".ticket-description").textContent.trim(),
      date: details.date || "",
      location: details.location || "",
      time: details.time || "",
      host: details.host || "",
    });

    window.location.href = `purchase.html?${params.toString()}`;
  }

  document.querySelectorAll(".preview-button").forEach((button) => {
    button.addEventListener("click", function () {
      const ticketCard = this.closest(".ticket-card");
      const details = getEventDetails(ticketCard);
      const banner = ticketCard.querySelector(".ticket-image");

      activeTicketCard = ticketCard;
      previewDialog.querySelector(".preview-banner").src = banner.src;
      previewDialog.querySelector(".preview-banner").alt = banner.alt;
      previewDialog.querySelector("#preview-title").textContent =
        ticketCard.querySelector(".ticket-title").textContent.trim();
      previewDialog.querySelector(".preview-description").textContent =
        ticketCard.querySelector(".ticket-description").textContent.trim();
      previewDialog.querySelector(".preview-date").textContent =
        details.date || "To be announced";
      previewDialog.querySelector(".preview-time").textContent =
        details.time || "To be announced";
      previewDialog.querySelector(".preview-location").textContent =
        details.location || "To be announced";
      previewDialog.querySelector(".preview-host").textContent =
        details.host || "To be announced";

      updateCountdown(details.date || "");
      window.clearInterval(countdownInterval);
      countdownInterval = window.setInterval(
        () => updateCountdown(details.date || ""),
        1000
      );
      previewDialog.showModal();
      closePreviewButton.focus();
    });
  });

  document.querySelectorAll(".buy-ticket-button").forEach((button) => {
    button.addEventListener("click", function () {
      openPurchasePage(this.closest(".ticket-card"));
    });
  });

  previewBuyButton.addEventListener("click", function () {
    if (activeTicketCard) {
      openPurchasePage(activeTicketCard);
    }
  });

  closePreviewButton.addEventListener("click", function () {
    previewDialog.close();
  });

  previewDialog.addEventListener("click", function (event) {
    if (event.target === previewDialog) {
      previewDialog.close();
    }
  });

  previewDialog.addEventListener("close", function () {
    window.clearInterval(countdownInterval);
    activeTicketCard = null;
  });
});

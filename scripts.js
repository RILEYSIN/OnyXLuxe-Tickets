document.addEventListener("DOMContentLoaded", function () {
  const eventList = document.querySelector(".ticket-previews-container");
  const previewDialog = document.querySelector(".event-preview-dialog");
  if (!eventList || !previewDialog || !Array.isArray(window.EVENTS)) {
    return;
  }

  const closeButton = previewDialog.querySelector(".preview-close-button");
  const previewBuyButton = previewDialog.querySelector(".preview-buy-button");
  let activeEvent = null;

  function addFact(container, label, value) {
    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    paragraph.append(strong, document.createTextNode(value));
    container.append(paragraph);
  }

  function openPurchase(eventDetails) {
    window.location.href = `purchase.html?event=${encodeURIComponent(eventDetails.id)}`;
  }

  function showEvent(eventDetails) {
    activeEvent = eventDetails;
    previewDialog.querySelector(".preview-banner").src = eventDetails.image;
    previewDialog.querySelector(".preview-banner").alt = eventDetails.imageAlt;
    previewDialog.querySelector("#preview-title").textContent = eventDetails.title;
    previewDialog.querySelector(".preview-description").textContent =
      eventDetails.description;
    previewDialog.querySelector(".preview-date").textContent = eventDetails.date;
    previewDialog.querySelector(".preview-time").textContent = eventDetails.time;
    previewDialog.querySelector(".preview-location").textContent =
      eventDetails.location;
    previewDialog.querySelector(".preview-host").textContent = eventDetails.host;
    previewDialog.querySelector(".preview-price strong").textContent =
      `${window.formatNaira(eventDetails.price)} / person`;
    previewDialog.showModal();
    closeButton.focus();
  }

  function renderEvent(eventDetails) {
    const card = document.createElement("article");
    card.className = "ticket-card";

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "ticket-image-wrapper";
    const image = document.createElement("img");
    image.className = "ticket-image";
    image.src = eventDetails.image;
    image.alt = eventDetails.imageAlt;
    image.loading = "lazy";
    imageWrapper.append(image);

    const details = document.createElement("div");
    details.className = "ticket-details";

    const title = document.createElement("h3");
    title.className = "ticket-title";
    title.textContent = eventDetails.title;
    const description = document.createElement("p");
    description.className = "ticket-description";
    description.textContent = eventDetails.description;

    const facts = document.createElement("div");
    facts.className = "ticket-preview-details";
    addFact(facts, "Date", eventDetails.date);
    addFact(facts, "Location", eventDetails.location);
    addFact(facts, "Time", eventDetails.time);
    addFact(facts, "Host", eventDetails.host);

    const price = document.createElement("p");
    price.className = "ticket-price";
    price.textContent = `${window.formatNaira(eventDetails.price)} per ticket`;

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.className = "preview-button";
    previewButton.textContent = "Preview Details";
    previewButton.addEventListener("click", () => showEvent(eventDetails));

    const buyButton = document.createElement("button");
    buyButton.type = "button";
    buyButton.className = "buy-ticket-button";
    buyButton.textContent = "Buy Ticket";
    buyButton.addEventListener("click", () => openPurchase(eventDetails));

    details.append(title, description, facts, price, previewButton, buyButton);
    card.append(imageWrapper, details);
    eventList.append(card);
  }

  eventList.querySelectorAll(".ticket-card").forEach((card) => card.remove());
  window.EVENTS.forEach(renderEvent);

  closeButton.addEventListener("click", () => previewDialog.close());
  previewBuyButton.addEventListener("click", () => {
    if (activeEvent) {
      openPurchase(activeEvent);
    }
  });
  previewDialog.addEventListener("click", (event) => {
    if (event.target === previewDialog) {
      previewDialog.close();
    }
  });
  previewDialog.addEventListener("close", () => {
    activeEvent = null;
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.querySelector("[data-menu-toggle]");
  const navigation = document.querySelector("[data-menu]");
  if (!toggle || !navigation) {
    return;
  }

  function setOpen(isOpen) {
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu"
    );
    navigation.dataset.open = String(isOpen);
  }

  toggle.addEventListener("click", function () {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("click", function (event) {
    if (
      toggle.getAttribute("aria-expanded") === "true" &&
      !toggle.contains(event.target) &&
      !navigation.contains(event.target)
    ) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 769px)").matches) {
      setOpen(false);
    }
  });
});

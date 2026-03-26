const eventVenueInfoModal = document.getElementById("event-venue-info-modal");
const eventVenueInfoOpenButton = document.getElementById("event-venue-info-open");
const eventVenueInfoCloseButton = document.getElementById("event-venue-info-close");
const eventVenueInfoOverlay = eventVenueInfoModal?.querySelector(".event-venue-info-overlay");

function openEventVenueInfo() {
  if (!eventVenueInfoModal) return;

  eventVenueInfoModal.classList.add("active");
  eventVenueInfoModal.setAttribute("aria-hidden", "false");
}

function closeEventVenueInfo() {
  if (!eventVenueInfoModal) return;

  eventVenueInfoModal.classList.remove("active");
  eventVenueInfoModal.setAttribute("aria-hidden", "true");
}

eventVenueInfoOpenButton?.addEventListener("click", openEventVenueInfo);
eventVenueInfoCloseButton?.addEventListener("click", closeEventVenueInfo);
eventVenueInfoOverlay?.addEventListener("click", closeEventVenueInfo);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && eventVenueInfoModal?.classList.contains("active")) {
    closeEventVenueInfo();
  }
});

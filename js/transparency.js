const transparencyModal = document.getElementById("transparency-modal");
const transparencyOpenButton = document.getElementById("transparency-open");
const transparencyCloseButton = document.getElementById("transparency-close");
const transparencyOverlay = transparencyModal?.querySelector(".transparency-modal-overlay");

function openTransparency() {
  if (!transparencyModal) return;

  transparencyModal.classList.add("active");
  transparencyModal.setAttribute("aria-hidden", "false");
}

function closeTransparency() {
  if (!transparencyModal) return;

  transparencyModal.classList.remove("active");
  transparencyModal.setAttribute("aria-hidden", "true");
}

transparencyOpenButton?.addEventListener("click", openTransparency);
transparencyCloseButton?.addEventListener("click", closeTransparency);
transparencyOverlay?.addEventListener("click", closeTransparency);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && transparencyModal?.classList.contains("active")) {
    closeTransparency();
  }
});

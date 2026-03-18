const legalModal = document.getElementById("legal-notice-modal");
const legalOpenButton = document.getElementById("legal-notice-open");
const legalCloseButton = document.getElementById("legal-notice-close");
const legalOverlay = legalModal?.querySelector(".legal-modal-overlay");

function openLegalNotice() {
  if (!legalModal) return;

  legalModal.classList.add("active");
  legalModal.setAttribute("aria-hidden", "false");
}

function closeLegalNotice() {
  if (!legalModal) return;

  legalModal.classList.remove("active");
  legalModal.setAttribute("aria-hidden", "true");
}

legalOpenButton?.addEventListener("click", openLegalNotice);
legalCloseButton?.addEventListener("click", closeLegalNotice);
legalOverlay?.addEventListener("click", closeLegalNotice);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && legalModal?.classList.contains("active")) {
    closeLegalNotice();
  }
});

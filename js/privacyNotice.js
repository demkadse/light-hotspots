const PRIVACY_NOTICE_STORAGE_KEY = "light-hotspots.privacy-notice-seen";

const privacyNoticeModal = document.getElementById("privacy-first-visit-modal");
const privacyNoticeAcknowledgeButton = document.getElementById("privacy-first-visit-ack");
const privacyNoticeOpenLink = document.getElementById("privacy-first-visit-open");

function markPrivacyNoticeAsSeen() {
  try {
    localStorage.setItem(PRIVACY_NOTICE_STORAGE_KEY, "1");
  } catch (error) {
    console.warn("Datenschutzhinweis konnte nicht gespeichert werden.", error);
  }
}

function hasSeenPrivacyNotice() {
  try {
    return localStorage.getItem(PRIVACY_NOTICE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function openPrivacyNotice() {
  if (!privacyNoticeModal) {
    return;
  }

  privacyNoticeModal.classList.add("active");
  privacyNoticeModal.setAttribute("aria-hidden", "false");
}

function closePrivacyNotice() {
  if (!privacyNoticeModal) {
    return;
  }

  privacyNoticeModal.classList.remove("active");
  privacyNoticeModal.setAttribute("aria-hidden", "true");
}

privacyNoticeAcknowledgeButton?.addEventListener("click", () => {
  markPrivacyNoticeAsSeen();
  closePrivacyNotice();
});

privacyNoticeOpenLink?.addEventListener("click", () => {
  markPrivacyNoticeAsSeen();
});

if (privacyNoticeModal && !hasSeenPrivacyNotice()) {
  openPrivacyNotice();
}

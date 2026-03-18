const modal = document.getElementById("event-modal");
const modalContent = document.getElementById("modal-content");

function appendParagraph(parent, label, value) {
  const paragraph = document.createElement("p");

  if (label) {
    const strong = document.createElement("b");
    strong.textContent = `${label}: `;
    paragraph.appendChild(strong);
  }

  paragraph.appendChild(document.createTextNode(value));
  parent.appendChild(paragraph);
}

function openModal(event) {
  modalContent.replaceChildren();

  if (event.image) {
    const image = document.createElement("img");
    image.alt = event.title || "Eventbild";
    image.src = event.image;
    modalContent.appendChild(image);
  }

  const title = document.createElement("h2");
  title.id = "modal-title";
  title.textContent = event.title || "Unbenannt";
  modalContent.appendChild(title);

  appendParagraph(modalContent, "Venue", event.venue || "-");
  appendParagraph(modalContent, "Host", event.host || event.created_by || "-");
  appendParagraph(
    modalContent,
    "",
    `${event.date || ""} ${event.start_time || event.time || ""}`.trim()
  );
  appendParagraph(modalContent, "", event.description || "");

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

document.getElementById("modal-close").onclick = closeModal;
document.querySelector(".modal-overlay").onclick = closeModal;
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modal.classList.contains("active")) {
    closeModal();
  }
});

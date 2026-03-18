const modal = document.getElementById("event-modal");
const modalContent = document.getElementById("modal-content");

function appendParagraph(parent, label, value) {
  const p = document.createElement("p");

  if (label) {
    const strong = document.createElement("b");
    strong.textContent = `${label}: `;
    p.appendChild(strong);
  }

  p.appendChild(document.createTextNode(value));
  parent.appendChild(p);
}

function openModal(event){
modalContent.replaceChildren();

const image = document.createElement("img");
image.style.width = "100%";
image.alt = event.title || "Eventbild";
image.src = event.image || "";
modalContent.appendChild(image);

const title = document.createElement("h2");
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

}

function closeModal(){
modal.classList.remove("active");
}

document.getElementById("modal-close").onclick = closeModal;
document.querySelector(".modal-overlay").onclick = closeModal;

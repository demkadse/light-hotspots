const modal = document.getElementById("event-modal");
const modalContent = document.getElementById("modal-content");

function getProjectLead(event) {
  return event.project_lead || event.venue_lead || event.host || "";
}

function formatTypeLabel(event) {
  return event.type || event.event_type || "Event";
}

function formatCategoryLabel(event) {
  return window.getEventCategoryLabel?.(event) || "Event";
}

function isCancelled(event) {
  return event.status === "cancelled";
}

function formatRecurrenceLabel(event) {
  if (event.recurrence_rule === "weekly") {
    return "Woechentlich";
  }

  if (event.recurrence_rule === "biweekly") {
    return "Zweiwoechig";
  }

  if (event.recurrence_rule === "triweekly") {
    return "Dreiwoechig";
  }

  return null;
}

function formatTimeRange(event) {
  const date = event.date || "";
  const start = event.start_time || event.time || "";
  const end = event.end_time || "";

  if (date && start && end) {
    return `${date} | ${start} - ${end}`;
  }

  if (date && start) {
    return `${date} | ${start}`;
  }

  return [date, start || end].filter(Boolean).join(" | ") || "Zeit offen";
}

function appendDetailItem(parent, label, value) {
  if (!value) return;

  const item = document.createElement("div");
  item.className = "modal-detail-item";

  const labelNode = document.createElement("span");
  labelNode.className = "modal-detail-label";
  labelNode.textContent = label;

  const valueNode = document.createElement("span");
  valueNode.className = "modal-detail-value";
  valueNode.textContent = value;

  item.append(labelNode, valueNode);
  parent.appendChild(item);
}

function appendSectionTitle(parent, text) {
  const title = document.createElement("h3");
  title.className = "modal-section-title";
  title.textContent = text;
  parent.appendChild(title);
}

function buildRelatedEvents(event) {
  const allEvents = window.EVENT_CONTEXT?.visibleEvents || window.EVENT_CONTEXT?.allEvents || [];

  return allEvents
    .filter(entry => entry.id !== event.id)
    .filter(entry => entry.date === event.date)
    .filter(entry => entry.venue === event.venue || entry.type === event.type)
    .slice(0, 3);
}

function openModal(event) {
  modalContent.replaceChildren();

  const image = document.createElement("img");
  image.alt = event.title || "Veranstaltungsbild";
  image.src = window.getEventImageSource?.(event) || event.image || "placeholder.png";
  modalContent.appendChild(image);

  const topRow = document.createElement("div");
  topRow.className = "modal-top-row";

  const topChipRow = document.createElement("div");
  topChipRow.className = "modal-chip-row";

  const categoryChip = document.createElement("span");
  categoryChip.className = "event-chip";
  categoryChip.textContent = formatCategoryLabel(event);

  const typeChip = document.createElement("span");
  typeChip.className = "event-time-chip";
  typeChip.textContent = formatTypeLabel(event);

  const timeChip = document.createElement("span");
  timeChip.className = "event-time-chip";
  timeChip.textContent = formatTimeRange(event);

  topChipRow.append(categoryChip, typeChip, timeChip);
  topRow.appendChild(topChipRow);

  if (isCancelled(event)) {
    const statusChip = document.createElement("span");
    statusChip.className = "event-status-chip event-status-chip-cancelled";
    statusChip.textContent = "Abgesagt";
    topRow.appendChild(statusChip);
  }

  modalContent.appendChild(topRow);

  const title = document.createElement("h2");
  title.id = "modal-title";
  title.textContent = event.title || "Unbenannt";
  modalContent.appendChild(title);

  const details = document.createElement("div");
  details.className = "modal-details-grid";
  appendDetailItem(details, "Kategorie", formatCategoryLabel(event));
  appendDetailItem(details, "Typ", formatTypeLabel(event));
  appendDetailItem(details, "Venue", event.venue || "Ort offen");
  appendDetailItem(details, "Server", event.server);
  appendDetailItem(details, "Projektleitung", getProjectLead(event));
  appendDetailItem(details, "Wiederholung", formatRecurrenceLabel(event));
  appendDetailItem(details, "Zeit", formatTimeRange(event));
  modalContent.appendChild(details);

  if (isCancelled(event)) {
    appendSectionTitle(modalContent, "Status");
    const cancellationNotice = document.createElement("p");
    cancellationNotice.className = "modal-copy modal-copy-cancelled";
    cancellationNotice.textContent = "Dieses Event wurde abgesagt.";
    modalContent.appendChild(cancellationNotice);
  }

  appendSectionTitle(modalContent, "Beschreibung");
  const description = document.createElement("p");
  description.className = "modal-copy";
  description.textContent = event.description || "Keine Beschreibung vorhanden.";
  modalContent.appendChild(description);

  if (event.notes) {
    appendSectionTitle(modalContent, "Hinweise");
    const notes = document.createElement("p");
    notes.className = "modal-copy modal-copy-muted";
    notes.textContent = event.notes;
    modalContent.appendChild(notes);
  }

  const linkRow = document.createElement("div");
  linkRow.className = "modal-link-row";

  if (event.discord_link) {
    const cta = document.createElement("a");
    cta.className = "modal-link-button";
    cta.href = event.discord_link;
    cta.target = "_blank";
    cta.rel = "noreferrer noopener";
    cta.textContent = "Discord-Server oeffnen";
    linkRow.appendChild(cta);
  }

  const externalLink = event.link || (Array.isArray(event.links)
    ? event.links.find(link => link && link !== event.discord_link)
    : null);

  if (externalLink) {
    const cta = document.createElement("a");
    cta.className = "modal-link-button";
    cta.href = externalLink;
    cta.target = "_blank";
    cta.rel = "noreferrer noopener";
    cta.textContent = "Externe Infos oeffnen";
    linkRow.appendChild(cta);
  }

  if (linkRow.childElementCount > 0) {
    modalContent.appendChild(linkRow);
  }

  const relatedEvents = buildRelatedEvents(event);
  if (relatedEvents.length > 0) {
    const related = document.createElement("section");
    related.className = "modal-related";

    appendSectionTitle(related, "Am selben Abend");

    const list = document.createElement("div");
    list.className = "modal-related-list";

    relatedEvents.forEach(entry => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "modal-related-pill";
      pill.textContent = `${entry.title} • ${entry.start_time || entry.time || "Zeit offen"}`;
      pill.addEventListener("click", () => openModal(entry));
      list.appendChild(pill);
    });

    related.appendChild(list);
    modalContent.appendChild(related);
  }

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

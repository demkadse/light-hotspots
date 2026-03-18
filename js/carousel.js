function formatHostName(event) {
  const host = event.host || event.host_display_name || event.created_by || "";

  if (!host) {
    return "Unbekannter Host";
  }

  if (/^\d{17,20}$/.test(host)) {
    return event.venue ? `Host des ${event.venue}` : "Discord-Host";
  }

  return host;
}

function formatTypeLabel(event) {
  return event.type || event.event_type || "Event";
}

function formatTimeRange(event) {
  const start = event.start_time || event.time || "";
  const end = event.end_time || "";

  if (start && end) {
    return `${start} - ${end}`;
  }

  return start || "Zeit offen";
}

function appendMetaItem(parent, label, value) {
  if (!value) return;

  const item = document.createElement("div");
  item.className = "event-meta-item";

  const labelNode = document.createElement("span");
  labelNode.className = "event-meta-label";
  labelNode.textContent = label;

  const valueNode = document.createElement("span");
  valueNode.className = "event-meta-value";
  valueNode.textContent = value;

  item.append(labelNode, valueNode);
  parent.appendChild(item);
}

async function createCarousel(date) {
  const track = document.createElement("div");
  track.className = "carousel-track";

  const index = await getIndex();
  const target = formatDate(date).trim();
  const matchingEntries = index.filter(entry => normalizeDate(entry.date).trim() === target);

  if (didIndexLoadFail()) {
    track.appendChild(buildInfoCard(
      "Events konnten nicht geladen werden",
      "Bitte spaeter erneut versuchen."
    ));
    return track;
  }

  if (matchingEntries.length === 0) {
    track.appendChild(buildInfoCard(
      "Keine Events eingetragen",
      "Erstell deins ueber den Discord-Bot!"
    ));
    return track;
  }

  const events = await Promise.all(matchingEntries.map(entry => getEvent(entry.file)));
  const validEvents = events.filter(Boolean);

  if (validEvents.length === 0) {
    track.appendChild(buildInfoCard(
      "Events konnten nicht geladen werden",
      "Mindestens eine Event-Datei ist fehlerhaft."
    ));
    return track;
  }

  validEvents.forEach(event => {
    track.appendChild(buildCard(event));
  });

  return track;
}

function buildCard(event) {
  const card = document.createElement("div");
  card.className = "event-card";

  if (event.image) {
    const image = document.createElement("img");
    image.className = "event-image";
    image.src = event.image;
    image.alt = event.title || "Eventbild";
    card.appendChild(image);
  }

  const info = document.createElement("div");
  info.className = "event-info";

  const headerRow = document.createElement("div");
  headerRow.className = "event-card-header";

  const chip = document.createElement("span");
  chip.className = "event-chip";
  chip.textContent = formatTypeLabel(event);

  const timeChip = document.createElement("span");
  timeChip.className = "event-time-chip";
  timeChip.textContent = formatTimeRange(event);

  headerRow.append(chip, timeChip);

  const title = document.createElement("h3");
  title.textContent = event.title || "Unbenannt";

  const meta = document.createElement("div");
  meta.className = "event-meta";
  appendMetaItem(meta, "Venue", event.venue || "Ort offen");
  appendMetaItem(meta, "Host", formatHostName(event));

  if (event.venue_lead) {
    appendMetaItem(meta, "Leitung", event.venue_lead);
  }

  const description = document.createElement("p");
  description.className = "event-summary";
  description.textContent = event.description || "Keine Beschreibung vorhanden.";

  info.append(headerRow, title, meta, description);

  if (event.link) {
    const linkButton = document.createElement("span");
    linkButton.className = "event-link-hint";
    linkButton.textContent = "Mehr Infos im Detailfenster";
    info.appendChild(linkButton);
  }

  card.appendChild(info);
  card.onclick = () => openModal(event);

  return card;
}

function buildInfoCard(titleText, bodyText) {
  const card = document.createElement("div");
  card.className = "event-card info-card";

  const info = document.createElement("div");
  info.className = "event-info";

  const title = document.createElement("h3");
  title.textContent = titleText;

  const text = document.createElement("p");
  text.textContent = bodyText;

  info.appendChild(title);
  info.appendChild(text);

  const inviteUrl = window.SITE_CONFIG?.discordInviteUrl;
  if (inviteUrl && titleText === "Keine Events eingetragen") {
    const link = document.createElement("a");
    link.href = inviteUrl;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = "Discord Server";
    info.appendChild(link);
  }

  card.appendChild(info);
  return card;
}

function formatDate(date) {
  return `${date.getFullYear()}-${
    String(date.getMonth() + 1).padStart(2, "0")
  }-${
    String(date.getDate()).padStart(2, "0")
  }`;
}

function normalizeDate(value) {
  if (!value) return "";

  const trimmed = value.trim();

  if (trimmed.includes(".")) {
    const [day, month, year] = trimmed.split(".");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

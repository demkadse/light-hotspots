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

  const events = await Promise.all(
    matchingEntries.map(entry => getEvent(entry.file))
  );

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

  const title = document.createElement("h3");
  title.textContent = event.title || "Unbenannt";

  const time = document.createElement("p");
  time.textContent = event.start_time || event.time || "Keine Zeit";

  const host = document.createElement("p");
  host.textContent = event.host || event.created_by || "Unbekannt";

  info.appendChild(title);
  info.appendChild(time);
  info.appendChild(host);

  card.appendChild(info);
  card.onclick = () => openModal(event);

  return card;
}

function buildInfoCard(titleText, bodyText) {
  const card = document.createElement("div");
  card.className = "event-card";

  const info = document.createElement("div");
  info.className = "event-info";
  info.style.height = "100%";
  info.style.display = "flex";
  info.style.flexDirection = "column";
  info.style.justifyContent = "center";
  info.style.alignItems = "center";
  info.style.textAlign = "center";

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

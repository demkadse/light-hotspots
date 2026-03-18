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

function scrollCarousel(track, direction) {
  const firstCard = track.querySelector(".event-card");
  const step = firstCard
    ? firstCard.getBoundingClientRect().width + 22
    : track.clientWidth * 0.8;

  track.scrollBy({
    left: direction * step,
    behavior: "smooth"
  });
}

function updateCarouselButtons(track, prevButton, nextButton) {
  const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);

  prevButton.disabled = track.scrollLeft <= 8;
  nextButton.disabled = track.scrollLeft >= maxScrollLeft - 8;
}

function buildCarouselControls(track) {
  const controls = document.createElement("div");
  controls.className = "carousel-controls";

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "carousel-arrow";
  prevButton.setAttribute("aria-label", "Vorherige Events");
  prevButton.textContent = "<";

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "carousel-arrow";
  nextButton.setAttribute("aria-label", "Naechste Events");
  nextButton.textContent = ">";

  prevButton.addEventListener("click", event => {
    event.stopPropagation();
    scrollCarousel(track, -1);
  });

  nextButton.addEventListener("click", event => {
    event.stopPropagation();
    scrollCarousel(track, 1);
  });

  track.addEventListener("scroll", () => {
    updateCarouselButtons(track, prevButton, nextButton);
  }, { passive: true });

  requestAnimationFrame(() => {
    updateCarouselButtons(track, prevButton, nextButton);
  });

  controls.append(prevButton, nextButton);
  return controls;
}

function buildCard(event) {
  const card = document.createElement("article");
  card.className = "event-card";

  const media = document.createElement("div");
  media.className = "event-media";

  if (event.image) {
    const image = document.createElement("img");
    image.className = "event-image";
    image.src = event.image;
    image.alt = event.title || "Eventbild";
    image.loading = "lazy";
    media.appendChild(image);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "event-image event-image-fallback";
    fallback.textContent = formatTypeLabel(event);
    media.appendChild(fallback);
  }

  const titleBanner = document.createElement("div");
  titleBanner.className = "event-title-banner";

  const title = document.createElement("h3");
  title.textContent = event.title || "Unbenannt";
  titleBanner.appendChild(title);

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

  info.append(headerRow, meta, description);

  if (event.discord_link || event.link) {
    const linkHint = document.createElement("span");
    linkHint.className = "event-link-hint";
    linkHint.textContent = event.discord_link ? "Mit Event-Discord" : "Mit externem Link";
    info.appendChild(linkHint);
  }

  card.append(media, titleBanner, info);
  card.addEventListener("click", () => openModal(event));

  return card;
}

function createCarousel(eventsForDay, controlsHost = null) {
  const shell = document.createElement("div");
  shell.className = "carousel-shell";

  const track = document.createElement("div");
  track.className = "carousel-track";

  if (didIndexLoadFail()) {
    shell.appendChild(track);
    return shell;
  }

  if (!eventsForDay || eventsForDay.length === 0) {
    shell.appendChild(track);
    return shell;
  }

  eventsForDay.forEach(event => {
    track.appendChild(buildCard(event));
  });

  const controls = buildCarouselControls(track);
  const hint = document.createElement("span");
  hint.className = "carousel-hint";
  hint.textContent = "Wische fuer weitere Events";

  if (controlsHost) {
    controls.classList.add("carousel-controls-inline");
    controlsHost.appendChild(controls);
    shell.append(track, hint);
  } else {
    shell.append(track, controls, hint);
  }

  return shell;
}

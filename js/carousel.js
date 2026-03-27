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

function formatTimeRange(event) {
  const start = event.start_time || event.time || "";
  const end = event.end_time || "";

  if (start && end) {
    return `${start} - ${end}`;
  }

  return start || "Zeit offen";
}

function appendMetaItem(parent, label, value, className = "") {
  if (!value) return;

  const item = document.createElement("div");
  item.className = "event-meta-item";
  if (className) {
    item.classList.add(className);
  }

  const labelNode = document.createElement("span");
  labelNode.className = "event-meta-label";
  labelNode.textContent = label;

  const valueNode = document.createElement("span");
  valueNode.className = "event-meta-value";
  valueNode.textContent = value;

  item.append(labelNode, valueNode);
  parent.appendChild(item);
}

function getSupportingLinkLabel(event) {
  if (event.discord_link) {
    return "Discord-Infos verfuegbar";
  }

  if (event.link || (Array.isArray(event.links) && event.links.length > 0)) {
    return "Weitere Infos verfuegbar";
  }

  return "";
}

function scrollCarousel(track, direction) {
  const cards = [...track.querySelectorAll(".event-card")];
  if (cards.length === 0) {
    return;
  }

  const closestIndex = getClosestCardIndex(track, cards);
  const targetIndex = Math.max(0, Math.min(cards.length - 1, closestIndex + direction));
  const targetCard = cards[targetIndex];

  track.scrollTo({
    left: targetCard.offsetLeft,
    behavior: "smooth"
  });
}

function updateCarouselButtons(track, prevButton, nextButton) {
  const cards = [...track.querySelectorAll(".event-card")];
  if (cards.length === 0) {
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  const closestIndex = getClosestCardIndex(track, cards);
  prevButton.disabled = closestIndex <= 0;
  nextButton.disabled = closestIndex >= cards.length - 1;
}

function getClosestCardIndex(track, cards) {
  const currentLeft = track.scrollLeft;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card, index) => {
    const distance = Math.abs(card.offsetLeft - currentLeft);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function snapToClosestCard(track) {
  const cards = [...track.querySelectorAll(".event-card")];
  if (cards.length === 0) {
    return;
  }

  const closestCard = cards[getClosestCardIndex(track, cards)];
  const delta = Math.abs(track.scrollLeft - closestCard.offsetLeft);

  if (delta < 4) {
    return;
  }

  track.scrollTo({
    left: closestCard.offsetLeft,
    behavior: "smooth"
  });
}

function buildCarouselNav(track) {
  const controls = document.createElement("div");
  controls.className = "carousel-nav";
  let snapTimer = null;

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "carousel-nav-button carousel-nav-button-prev";
  prevButton.setAttribute("aria-label", "Vorherige Events");
  prevButton.innerHTML = "<span aria-hidden=\"true\">&lsaquo;</span>";

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "carousel-nav-button carousel-nav-button-next";
  nextButton.setAttribute("aria-label", "Nächste Events");
  nextButton.innerHTML = "<span aria-hidden=\"true\">&rsaquo;</span>";

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

    if (window.matchMedia("(max-width: 768px)").matches) {
      return;
    }

    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      snapToClosestCard(track);
    }, 120);
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
  if (isCancelled(event)) {
    card.classList.add("event-card-cancelled");
  }

  const media = document.createElement("div");
  media.className = "event-media";
  const image = document.createElement("img");
  image.className = "event-image";
  image.src = window.getEventImageSource?.(event) || event.image || "placeholder.png";
  image.alt = event.title || "Veranstaltungsbild";
  image.loading = "lazy";
  media.appendChild(image);

  const titleBanner = document.createElement("div");
  titleBanner.className = "event-title-banner";

  const title = document.createElement("h3");
  title.textContent = event.title || "Unbenannt";
  titleBanner.appendChild(title);

  const info = document.createElement("div");
  info.className = "event-info";

  const headerRow = document.createElement("div");
  headerRow.className = "event-card-header";

  const chipRow = document.createElement("div");
  chipRow.className = "event-card-chip-row";

  const chip = document.createElement("span");
  chip.className = "event-chip";
  chip.textContent = formatCategoryLabel(event);

  const typeChip = document.createElement("span");
  typeChip.className = "event-time-chip";
  typeChip.textContent = formatTypeLabel(event);

  const timeChip = document.createElement("span");
  timeChip.className = "event-time-chip";
  timeChip.textContent = formatTimeRange(event);

  chipRow.append(chip, typeChip, timeChip);
  headerRow.appendChild(chipRow);

  if (isCancelled(event)) {
    const statusChip = document.createElement("span");
    statusChip.className = "event-status-chip event-status-chip-cancelled";
    statusChip.textContent = "Abgesagt";
    headerRow.appendChild(statusChip);
  }

  const meta = document.createElement("div");
  meta.className = "event-meta";
  appendMetaItem(meta, "Ort", event.venue || "Ort offen");
  appendMetaItem(meta, "Server", event.server, "event-meta-item-expanded");
  appendMetaItem(meta, "Projektleitung", getProjectLead(event), "event-meta-item-expanded");

  const summary = document.createElement("p");
  summary.className = "event-summary";
  summary.textContent = event.description || "Keine Beschreibung vorhanden.";

  const linkHint = document.createElement("span");
  linkHint.className = "event-link-hint";
  linkHint.textContent = getSupportingLinkLabel(event);

  if (!linkHint.textContent) {
    linkHint.hidden = true;
  }

  info.append(headerRow, meta, summary, linkHint);

  card.append(media, titleBanner, info);
  card.addEventListener("click", () => openModal(event));

  return card;
}

function createCarousel(eventsForDay) {
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

  const nav = buildCarouselNav(track);

  const hint = document.createElement("span");
  hint.className = "carousel-hint";
  hint.textContent = "Wische für weitere Events";

  shell.append(nav, track, hint);

  return shell;
}

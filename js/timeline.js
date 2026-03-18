const STORAGE_KEY = "light-hotspots.timeline-state";

const state = {
  slideIndex: 0,
  days: [],
  allEvents: [],
  featuredEvent: null,
  filters: {
    scope: "all",
    type: "",
    venue: ""
  },
  touchStartY: null
};

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function normalizeDateKey(value) {
  if (!value) return "";

  const trimmed = value.trim();
  if (trimmed.includes(".")) {
    const [day, month, year] = trimmed.split(".");
    return `${year}-${month}-${day}`;
  }

  return trimmed.slice(0, 10);
}

function getDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTodayIndex() {
  const todayKey = getDayKey(startOfDay(new Date()));
  const index = state.days.findIndex(day => getDayKey(day) === todayKey);
  return index >= 0 ? index : 0;
}

function buildDays() {
  const today = startOfDay(new Date());
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const days = [];
  const cursor = new Date(currentYear, currentMonth, 1);

  while (cursor.getMonth() === currentMonth && cursor.getFullYear() === currentYear) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  state.days = days;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getDayMarker(day, index) {
  const todayIndex = getTodayIndex();

  if (index === todayIndex) return "Heute";
  if (index === todayIndex + 1) return "Morgen";
  if (index === todayIndex - 1) return "Gestern";
  if (isWeekend(day)) return "Wochenende";
  return "Diese Woche";
}

function getDaySubtitle(eventsForDay) {
  if (eventsForDay.length === 0) {
    return "Noch keine sichtbaren Events fuer diesen Tag.";
  }

  if (eventsForDay.length === 1) {
    return "Ein sichtbares Event fuer diesen Tag.";
  }

  return `${eventsForDay.length} sichtbare Events fuer diesen Tag.`;
}

function getMonthTransitionLabel(day, index) {
  if (index === 0) {
    return `Monatsuebersicht fuer ${day.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`;
  }

  const previousDay = state.days[index - 1];
  if (previousDay && previousDay.getMonth() !== day.getMonth()) {
    return `Monatswechsel zu ${day.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`;
  }

  return "";
}

function getEventType(event) {
  return (event.type || event.event_type || "").trim();
}

function compareEvents(a, b) {
  const timeA = a.start_time || a.time || "";
  const timeB = b.start_time || b.time || "";
  return timeA.localeCompare(timeB) || (a.title || "").localeCompare(b.title || "");
}

function eventMatchesFilters(event, day) {
  const { scope, type, venue } = state.filters;
  const dayStart = startOfDay(day);
  const todayStart = startOfDay(new Date());

  if (scope === "today" && dayStart.getTime() !== todayStart.getTime()) {
    return false;
  }

  if (scope === "weekend" && !isWeekend(dayStart)) {
    return false;
  }

  if (type && getEventType(event) !== type) {
    return false;
  }

  if (venue && (event.venue || "") !== venue) {
    return false;
  }

  return true;
}

function getEventsForDay(day) {
  const dayKey = getDayKey(day);

  return state.allEvents
    .filter(event => normalizeDateKey(event.date) === dayKey)
    .filter(event => eventMatchesFilters(event, day))
    .sort(compareEvents);
}

function getVisibleEvents() {
  return state.allEvents
    .filter(event => {
      const eventDate = normalizeDateKey(event.date);
      const matchingDay = state.days.find(day => getDayKey(day) === eventDate);
      return matchingDay ? eventMatchesFilters(event, matchingDay) : false;
    })
    .sort((a, b) => normalizeDateKey(a.date).localeCompare(normalizeDateKey(b.date)) || compareEvents(a, b));
}

function saveState() {
  const payload = {
    filters: state.filters,
    dayKey: getDayKey(state.days[state.slideIndex] || state.days[getTodayIndex()] || new Date())
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Timeline state konnte nicht gespeichert werden.", error);
  }
}

function updateUrlState() {
  const url = new URL(window.location.href);
  url.searchParams.set("day", getDayKey(state.days[state.slideIndex] || state.days[getTodayIndex()] || new Date()));

  if (state.filters.scope !== "all") {
    url.searchParams.set("scope", state.filters.scope);
  } else {
    url.searchParams.delete("scope");
  }

  if (state.filters.type) {
    url.searchParams.set("type", state.filters.type);
  } else {
    url.searchParams.delete("type");
  }

  if (state.filters.venue) {
    url.searchParams.set("venue", state.filters.venue);
  } else {
    url.searchParams.delete("venue");
  }

  window.history.replaceState({}, "", url);
}

function restoreState() {
  const params = new URLSearchParams(window.location.search);
  let stored = null;

  try {
    const storedRaw = localStorage.getItem(STORAGE_KEY);
    stored = storedRaw ? JSON.parse(storedRaw) : null;
  } catch (error) {
    console.warn("Gespeicherter Timeline-State ist ungueltig und wird verworfen.", error);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorieren: Defaults greifen ohnehin.
    }
  }

  state.filters.scope = params.get("scope") || stored?.filters?.scope || "all";
  state.filters.type = params.get("type") || stored?.filters?.type || "";
  state.filters.venue = params.get("venue") || stored?.filters?.venue || "";

  const targetDayKey = params.get("day") || stored?.dayKey;
  if (targetDayKey) {
    const targetIndex = state.days.findIndex(day => getDayKey(day) === targetDayKey);
    state.slideIndex = targetIndex >= 0 ? targetIndex : getTodayIndex();
  } else {
    state.slideIndex = getTodayIndex();
  }
}

function renderTimelineDots(dayCounts) {
  const dots = document.getElementById("timeline-dots");
  dots.replaceChildren();

  state.days.forEach((day, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "timeline-dot";
    button.setAttribute("aria-label", day.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit"
    }));

    if ((dayCounts[index] || 0) > 0) {
      button.classList.add("has-events");
    }

    if (index === state.slideIndex) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      state.slideIndex = index;
      updateSlide();
    });

    dots.appendChild(button);
  });
}

function updateFeaturedEvent(activeDayEvents) {
  const title = document.getElementById("featured-event-title");
  const copy = document.getElementById("featured-event-copy");
  const button = document.getElementById("featured-event-open");
  const visibleEvents = getVisibleEvents();
  const featured = activeDayEvents[0] || visibleEvents[0] || null;

  state.featuredEvent = featured;

  if (!featured) {
    title.textContent = "Noch kein Event ausgewaehlt";
    copy.textContent = "Sobald sichtbare Events vorhanden sind, erscheint hier ein schneller Einstieg.";
    button.hidden = true;
    return;
  }

  title.textContent = featured.title || "Unbenannt";
  copy.textContent = `${featured.venue || "Ort offen"} - ${featured.start_time || featured.time || "Zeit offen"}${featured.end_time ? ` - ${featured.end_time}` : ""}`;
  button.hidden = false;
}

function updateHeroStats() {
  const todayKey = getDayKey(startOfDay(new Date()));
  const visibleEvents = getVisibleEvents();
  const todayVisible = visibleEvents.filter(event => normalizeDateKey(event.date) === todayKey);
  const types = new Set(visibleEvents.map(getEventType).filter(Boolean));

  document.getElementById("today-count").textContent = String(todayVisible.length);
  document.getElementById("week-count").textContent = String(visibleEvents.length);
  document.getElementById("type-count").textContent = String(types.size);
  document.getElementById("result-count").textContent = `${visibleEvents.length} sichtbare Events`;
}

function updateActiveDayMeta() {
  const activeDay = state.days[state.slideIndex] || state.days[0];
  const eventsForDay = activeDay ? getEventsForDay(activeDay) : [];

  if (!activeDay) {
    return;
  }

  document.getElementById("active-day-label").textContent = activeDay.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });
  document.getElementById("active-day-subtitle").textContent = getDaySubtitle(eventsForDay);
  document.getElementById("slide-position").textContent = `${state.slideIndex + 1} / ${state.days.length}`;
  updateFeaturedEvent(eventsForDay);
}

function updateSlide() {
  const track = document.getElementById("timeline-track");
  const viewport = document.querySelector(".timeline-viewport");
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (isMobile) {
    track.style.transform = "";
  } else {
    track.style.transform = `translateY(-${state.slideIndex * viewport.clientHeight}px)`;
  }

  Array.from(document.querySelectorAll(".timeline-dot")).forEach((dot, index) => {
    dot.classList.toggle("active", index === state.slideIndex);
  });

  updateActiveDayMeta();
  saveState();
  updateUrlState();
}

function changeSlide(direction) {
  const nextIndex = Math.min(Math.max(state.slideIndex + direction, 0), Math.max(state.days.length - 1, 0));

  if (nextIndex === state.slideIndex) {
    return;
  }

  state.slideIndex = nextIndex;
  updateSlide();
}

function renderTypeChips(uniqueTypes) {
  const row = document.getElementById("type-chip-row");
  row.replaceChildren();

  uniqueTypes.slice(0, 6).forEach(type => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "type-chip-button";
    button.textContent = type;
    button.classList.toggle("active", state.filters.type === type);

    button.addEventListener("click", () => {
      state.filters.type = state.filters.type === type ? "" : type;
      document.getElementById("type-filter").value = state.filters.type;
      state.slideIndex = getTodayIndex();
      void renderTimeline();
    });

    row.appendChild(button);
  });
}

function populateFilterOptions() {
  const typeSelect = document.getElementById("type-filter");
  const venueSelect = document.getElementById("venue-filter");
  const uniqueTypes = [...new Set(state.allEvents.map(getEventType).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const uniqueVenues = [...new Set(state.allEvents.map(event => event.venue).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  typeSelect.innerHTML = '<option value="">Alle Typen</option>';
  venueSelect.innerHTML = '<option value="">Alle Venues</option>';

  uniqueTypes.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });

  uniqueVenues.forEach(venue => {
    const option = document.createElement("option");
    option.value = venue;
    option.textContent = venue;
    venueSelect.appendChild(option);
  });

  typeSelect.value = state.filters.type;
  venueSelect.value = state.filters.venue;
  renderTypeChips(uniqueTypes);
}

function renderQuickJumps() {
  const container = document.getElementById("quick-jumps");
  container.replaceChildren();

  const candidates = [
    { label: "Heute", index: getTodayIndex() },
    { label: "Morgen", index: Math.min(getTodayIndex() + 1, state.days.length - 1) },
    { label: "Wochenende", index: state.days.findIndex(day => isWeekend(day) && getDayKey(day) >= getDayKey(startOfDay(new Date()))) },
    { label: "Monatsanfang", index: 0 },
    { label: "Erstes Event", index: state.days.findIndex(day => getEventsForDay(day).length > 0) }
  ];

  const seen = new Set();
  candidates.forEach(entry => {
    if (entry.index < 0 || seen.has(entry.index)) {
      return;
    }

    seen.add(entry.index);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-jump-button";
    button.textContent = entry.label;
    button.addEventListener("click", () => {
      state.slideIndex = entry.index;
      updateSlide();
    });
    container.appendChild(button);
  });
}

function renderDaySlide(day, index, eventsForDay, hasActiveFilters) {
  const slide = document.createElement("section");
  slide.className = "day-slide";
  if (eventsForDay.length === 0) {
    slide.classList.add("day-empty");
  }

  const header = document.createElement("header");
  header.className = "day-header";

  const copy = document.createElement("div");
  const marker = document.createElement("span");
  marker.className = "day-marker";
  marker.textContent = getDayMarker(day, index);

  const title = document.createElement("h2");
  title.className = "day-title";
  title.textContent = day.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const subtitle = document.createElement("p");
  subtitle.className = "day-subtitle";
  subtitle.textContent = getDaySubtitle(eventsForDay);

  copy.append(marker);

  const transitionLabel = getMonthTransitionLabel(day, index);
  if (transitionLabel) {
    const transition = document.createElement("span");
    transition.className = "day-transition";
    transition.textContent = transitionLabel;
    copy.appendChild(transition);
  }

  copy.append(title, subtitle);

  const headerSide = document.createElement("div");
  headerSide.className = "day-header-side";

  const count = document.createElement("div");
  count.className = "day-count";
  count.textContent = `${eventsForDay.length} Event${eventsForDay.length === 1 ? "" : "s"}`;

  const inviteUrl = window.SITE_CONFIG?.discordInviteUrl;
  if (eventsForDay.length === 0 && inviteUrl) {
    const cta = document.createElement("a");
    cta.className = "day-empty-cta";
    cta.href = inviteUrl;
    cta.target = "_blank";
    cta.rel = "noreferrer noopener";
    cta.textContent = hasActiveFilters
      ? "Keine Treffer? Filter anpassen oder im Discord selbst ein Event anlegen."
      : "Nichts los? Erstell hier selbst ein Event im Discord.";
    copy.appendChild(cta);
  }

  headerSide.appendChild(count);
  header.append(copy, headerSide);
  slide.appendChild(header);

  const carousel = createCarousel(eventsForDay, eventsForDay.length > 1 ? headerSide : null);
  if (carousel.childElementCount > 0 && eventsForDay.length > 0) {
    slide.appendChild(carousel);
  }

  return slide;
}

async function renderTimeline() {
  const track = document.getElementById("timeline-track");
  track.replaceChildren();

  const hasActiveFilters = Boolean(state.filters.type || state.filters.venue || state.filters.scope !== "all");
  const dayCounts = [];

  state.days.forEach((day, index) => {
    const eventsForDay = getEventsForDay(day);
    dayCounts.push(eventsForDay.length);
    track.appendChild(renderDaySlide(day, index, eventsForDay, hasActiveFilters));
  });

  renderTimelineDots(dayCounts);
  renderQuickJumps();
  updateHeroStats();
  updateSlide();
  window.EVENT_CONTEXT = { allEvents: state.allEvents, visibleEvents: getVisibleEvents() };
}

function bindFilterControls() {
  document.querySelectorAll(".scope-button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".scope-button").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      state.filters.scope = button.dataset.scope || "all";
      state.slideIndex = getTodayIndex();
      void renderTimeline();
    });
  });

  document.getElementById("type-filter").addEventListener("change", event => {
    state.filters.type = event.target.value;
    state.slideIndex = getTodayIndex();
    void renderTimeline();
  });

  document.getElementById("venue-filter").addEventListener("change", event => {
    state.filters.venue = event.target.value;
    state.slideIndex = getTodayIndex();
    void renderTimeline();
  });

  document.getElementById("jump-today").addEventListener("click", () => {
    state.slideIndex = getTodayIndex();
    updateSlide();
  });

  document.getElementById("featured-event-open").addEventListener("click", () => {
    if (state.featuredEvent) {
      openModal(state.featuredEvent);
    }
  });
}

function bindNavigationControls() {
  document.getElementById("nav-prev").addEventListener("click", () => changeSlide(-1));
  document.getElementById("nav-next").addEventListener("click", () => changeSlide(1));

  document.addEventListener("wheel", event => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      return;
    }

    if (Math.abs(event.deltaY) < 20) {
      return;
    }

    changeSlide(event.deltaY > 0 ? 1 : -1);
  }, { passive: true });

  document.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      changeSlide(1);
    }

    if (event.key === "ArrowUp" || event.key === "PageUp") {
      changeSlide(-1);
    }
  });

  document.addEventListener("touchstart", event => {
    state.touchStartY = event.touches[0]?.clientY ?? null;
  }, { passive: true });

  document.addEventListener("touchend", event => {
    if (state.touchStartY === null || window.matchMedia("(max-width: 768px)").matches) {
      state.touchStartY = null;
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? state.touchStartY;
    const deltaY = state.touchStartY - endY;

    if (Math.abs(deltaY) > 40) {
      changeSlide(deltaY > 0 ? 1 : -1);
    }

    state.touchStartY = null;
  }, { passive: true });

  window.addEventListener("resize", updateSlide);
}

function setupHeroCta() {
  const inviteUrl = window.SITE_CONFIG?.discordInviteUrl;
  const button = document.getElementById("discord-cta");

  if (!inviteUrl) {
    button.style.display = "none";
    return;
  }

  button.href = inviteUrl;
}

async function initTimeline() {
  setupHeroCta();
  buildDays();
  restoreState();
  state.allEvents = await getAllIndexedEvents();
  populateFilterOptions();
  bindFilterControls();
  bindNavigationControls();

  document.querySelectorAll(".scope-button").forEach(button => {
    button.classList.toggle("active", button.dataset.scope === state.filters.scope);
  });

  await renderTimeline();
}

void initTimeline();

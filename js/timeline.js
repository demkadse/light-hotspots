const STORAGE_KEY = "light-hotspots.timeline-state";

const state = {
  slideIndex: 0,
  days: [],
  allEvents: [],
  featuredEvent: null,
  filters: {
    scope: "all",
    type: "",
    venue: "",
    showEvents: true,
    showVenues: true
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

function parseVisibilityFlag(value, fallback = true) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return value !== "0" && value !== "false";
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

function getRenderedDays() {
  const todayKey = getDayKey(startOfDay(new Date()));

  if (state.filters.scope === "today") {
    return state.days.filter(day => getDayKey(day) === todayKey);
  }

  if (state.filters.scope === "weekend") {
    return state.days.filter(day => isWeekend(day));
  }

  return state.days;
}

function getPreferredSlideIndex(days = getRenderedDays()) {
  if (days.length === 0) {
    return 0;
  }

  if (state.filters.scope === "today") {
    return 0;
  }

  if (state.filters.scope === "weekend") {
    const todayStart = startOfDay(new Date()).getTime();
    const upcomingIndex = days.findIndex(day => startOfDay(day).getTime() >= todayStart);
    return upcomingIndex >= 0 ? upcomingIndex : 0;
  }

  const todayKey = getDayKey(startOfDay(new Date()));
  const todayIndex = days.findIndex(day => getDayKey(day) === todayKey);
  return todayIndex >= 0 ? todayIndex : 0;
}

function getDayMarker(day) {
  const today = startOfDay(new Date()).getTime();
  const current = startOfDay(day).getTime();
  const offset = Math.round((current - today) / 86400000);

  if (offset === 0) return "Heute";
  if (offset === 1) return "Morgen";
  if (offset === -1) return "Gestern";
  if (isWeekend(day)) return "Wochenende";
  return "Diese Woche";
}

function getDaySubtitle(eventsForDay) {
  if (eventsForDay.length === 1) {
    return "Ein sichtbares Event fuer diesen Tag.";
  }

  if (eventsForDay.length > 1) {
    return `${eventsForDay.length} sichtbare Events fuer diesen Tag.`;
  }

  return "";
}

function getMonthTransitionLabel(day, index, days) {
  if (index === 0) {
    return `Monatsuebersicht fuer ${day.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`;
  }

  const previousDay = days[index - 1];
  if (previousDay && previousDay.getMonth() !== day.getMonth()) {
    return `Monatswechsel zu ${day.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`;
  }

  return "";
}

function getEventType(event) {
  return (event.type || event.event_type || "").trim();
}

function isEventCategoryVisible(event) {
  const category = window.classifyEventCategory?.(event) || "event";

  if (category === "venue") {
    return state.filters.showVenues;
  }

  return state.filters.showEvents;
}

function compareEvents(a, b) {
  const timeA = a.start_time || a.time || "";
  const timeB = b.start_time || b.time || "";
  return timeA.localeCompare(timeB) || (a.title || "").localeCompare(b.title || "");
}

function getCurrentWeekRange() {
  const today = startOfDay(new Date());
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { today, weekStart, weekEnd };
}

function isEventInCurrentWeekUpcoming(event) {
  const eventDateKey = normalizeDateKey(event.date);
  if (!eventDateKey) {
    return false;
  }

  const eventDate = startOfDay(new Date(`${eventDateKey}T00:00:00`));
  const { today, weekEnd } = getCurrentWeekRange();

  return eventDate.getTime() >= today.getTime() && eventDate.getTime() <= weekEnd.getTime();
}

function compareFeaturedEvents(a, b) {
  const dateDiff = normalizeDateKey(a.date).localeCompare(normalizeDateKey(b.date));
  if (dateDiff !== 0) {
    return dateDiff;
  }

  return compareEvents(a, b);
}

function pickFeaturedEvent(events) {
  if (!events || events.length === 0) {
    return null;
  }

  return [...events].sort(compareFeaturedEvents)[0];
}

function eventMatchesFilters(event, day) {
  const { type, venue } = state.filters;
  const renderedDays = getRenderedDays();

  if (!isEventCategoryVisible(event)) {
    return false;
  }

  if (type && getEventType(event) !== type) {
    return false;
  }

  if (venue && (event.venue || "") !== venue) {
    return false;
  }

  return renderedDays.some(renderedDay => getDayKey(renderedDay) === getDayKey(day));
}

function getEventsForDay(day) {
  const dayKey = getDayKey(day);

  return state.allEvents
    .filter(event => normalizeDateKey(event.date) === dayKey)
    .filter(event => eventMatchesFilters(event, day))
    .sort(compareEvents);
}

function getVisibleEvents() {
  const renderedDays = getRenderedDays();

  return state.allEvents
    .filter(event => {
      const eventDate = normalizeDateKey(event.date);
      const matchingDay = renderedDays.find(day => getDayKey(day) === eventDate);
      return matchingDay ? eventMatchesFilters(event, matchingDay) : false;
    })
    .sort((a, b) => normalizeDateKey(a.date).localeCompare(normalizeDateKey(b.date)) || compareEvents(a, b));
}

function saveState() {
  const renderedDays = getRenderedDays();
  const fallbackIndex = getPreferredSlideIndex(renderedDays);
  const activeDay = renderedDays[state.slideIndex] || renderedDays[fallbackIndex] || new Date();
  const payload = {
    filters: state.filters,
    dayKey: getDayKey(activeDay)
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Timeline state konnte nicht gespeichert werden.", error);
  }
}

function updateUrlState() {
  const renderedDays = getRenderedDays();
  const fallbackIndex = getPreferredSlideIndex(renderedDays);
  const activeDay = renderedDays[state.slideIndex] || renderedDays[fallbackIndex] || new Date();
  const url = new URL(window.location.href);
  url.searchParams.set("day", getDayKey(activeDay));

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

  url.searchParams.set("showEvents", state.filters.showEvents ? "1" : "0");
  url.searchParams.set("showVenues", state.filters.showVenues ? "1" : "0");

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
  state.filters.showEvents = parseVisibilityFlag(params.get("showEvents"), parseVisibilityFlag(stored?.filters?.showEvents, true));
  state.filters.showVenues = parseVisibilityFlag(params.get("showVenues"), parseVisibilityFlag(stored?.filters?.showVenues, true));

  if (!state.filters.showEvents && !state.filters.showVenues) {
    state.filters.showEvents = true;
    state.filters.showVenues = true;
  }

  const renderedDays = getRenderedDays();
  const targetDayKey = params.get("day") || stored?.dayKey;
  if (targetDayKey) {
    const targetIndex = renderedDays.findIndex(day => getDayKey(day) === targetDayKey);
    state.slideIndex = targetIndex >= 0 ? targetIndex : getPreferredSlideIndex(renderedDays);
  } else {
    state.slideIndex = getPreferredSlideIndex(renderedDays);
  }
}

function renderTimelineDots(dayCounts) {
  const dots = document.getElementById("timeline-dots");
  const renderedDays = getRenderedDays();
  dots.replaceChildren();

  renderedDays.forEach((day, index) => {
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

function updateFeaturedEvent() {
  const title = document.getElementById("featured-event-title");
  const copy = document.getElementById("featured-event-copy");
  const button = document.getElementById("featured-event-open");
  const visibleEvents = getVisibleEvents();
  const weeklyUpcomingEvents = visibleEvents.filter(isEventInCurrentWeekUpcoming);
  const featured = pickFeaturedEvent(weeklyUpcomingEvents);

  state.featuredEvent = featured;

  if (!featured) {
    title.textContent = "";
    title.hidden = true;
    copy.textContent = "Fuer den Rest dieser Woche steht aktuell kein Event im Fokus.";
    button.hidden = true;
    return;
  }

  title.textContent = featured.title || "Unbenannt";
  title.hidden = false;
  copy.textContent = `${featured.venue || "Ort offen"} - ${featured.start_time || featured.time || "Zeit offen"}${featured.end_time ? ` - ${featured.end_time}` : ""}`;
  button.hidden = false;
}

function updateHeroStats() {
  const visibleEvents = getVisibleEvents();
  document.getElementById("result-count").textContent = `${visibleEvents.length} sichtbare Events`;
}

function updateActiveDayMeta() {
  const renderedDays = getRenderedDays();
  const activeDay = renderedDays[state.slideIndex] || renderedDays[0];
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
  document.getElementById("slide-position").textContent = `${state.slideIndex + 1} / ${renderedDays.length}`;
  updateFeaturedEvent();
}

function syncDesktopSlideHeights() {
  const track = document.getElementById("timeline-track");
  const viewport = document.querySelector(".timeline-viewport");
  const slides = [...track.querySelectorAll(".day-slide")];
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (isMobile || !viewport) {
    track.style.height = "";
    slides.forEach(slide => {
      slide.style.height = "";
      slide.style.flexBasis = "";
    });
    return null;
  }

  const viewportHeight = viewport.clientHeight;
  slides.forEach(slide => {
    slide.style.height = `${viewportHeight}px`;
    slide.style.flexBasis = `${viewportHeight}px`;
  });
  track.style.height = `${viewportHeight * slides.length}px`;
  return viewportHeight;
}

function updateSlide() {
  const renderedDays = getRenderedDays();
  const track = document.getElementById("timeline-track");
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const slideElements = [...track.querySelectorAll(".day-slide")];

  if (renderedDays.length === 0) {
    return;
  }

  state.slideIndex = Math.min(state.slideIndex, renderedDays.length - 1);
  syncDesktopSlideHeights();

  if (isMobile) {
    track.style.transform = "";
  } else {
    const targetSlide = slideElements[state.slideIndex];
    const targetOffset = targetSlide ? targetSlide.offsetTop : 0;
    track.style.transform = `translateY(-${targetOffset}px)`;
  }

  Array.from(document.querySelectorAll(".timeline-dot")).forEach((dot, index) => {
    dot.classList.toggle("active", index === state.slideIndex);
  });

  updateActiveDayMeta();
  saveState();
  updateUrlState();
}

function changeSlide(direction) {
  const renderedDays = getRenderedDays();
  const nextIndex = Math.min(Math.max(state.slideIndex + direction, 0), Math.max(renderedDays.length - 1, 0));

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
      state.slideIndex = getPreferredSlideIndex();
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
  venueSelect.innerHTML = '<option value="">Alle Plots</option>';

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

function syncCategoryToggle(buttonId, isActive) {
  const button = document.getElementById(buttonId);
  if (!button) {
    return;
  }

  button.classList.toggle("active", isActive);
  button.setAttribute("aria-pressed", String(isActive));
}

function updateCategoryToggleState() {
  syncCategoryToggle("category-toggle-event", state.filters.showEvents);
  syncCategoryToggle("category-toggle-venue", state.filters.showVenues);
}

function renderQuickJumps() {
  const container = document.getElementById("quick-jumps");
  const renderedDays = getRenderedDays();
  container.replaceChildren();

  const tomorrow = startOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);

  const candidates = [
    { label: "Morgen", index: renderedDays.findIndex(day => getDayKey(day) === getDayKey(tomorrow)) },
    { label: "Monatsanfang", index: 0 },
    { label: "Erstes Event", index: renderedDays.findIndex(day => getEventsForDay(day).length > 0) }
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

function renderDaySlide(day, index, eventsForDay, hasActiveFilters, days) {
  const slide = document.createElement("section");
  slide.className = "day-slide";

  const header = document.createElement("header");
  header.className = "day-header";

  const copy = document.createElement("div");
  const marker = document.createElement("span");
  marker.className = "day-marker";
  marker.textContent = getDayMarker(day);

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

  const transitionLabel = getMonthTransitionLabel(day, index, days);
  if (transitionLabel) {
    const transition = document.createElement("span");
    transition.className = "day-transition";
    transition.textContent = transitionLabel;
    copy.appendChild(transition);
  }

  copy.append(title, subtitle);

  const headerMeta = document.createElement("div");
  headerMeta.className = "day-header-meta";

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

  headerMeta.appendChild(count);
  header.append(copy, headerMeta);
  slide.appendChild(header);

  const body = document.createElement("div");
  body.className = "day-body";

  if (eventsForDay.length > 0) {
    const carousel = createCarousel(eventsForDay);
    if (carousel.childElementCount > 0) {
      body.appendChild(carousel);
    }
  }

  slide.appendChild(body);

  return slide;
}

async function renderTimeline() {
  const track = document.getElementById("timeline-track");
  const hasActiveFilters = Boolean(
    state.filters.type ||
    state.filters.venue ||
    state.filters.scope !== "all" ||
    !state.filters.showEvents ||
    !state.filters.showVenues
  );
  const renderedDays = getRenderedDays();
  const dayCounts = [];
  track.replaceChildren();

  renderedDays.forEach((day, index) => {
    const eventsForDay = getEventsForDay(day);
    dayCounts.push(eventsForDay.length);
    track.appendChild(renderDaySlide(day, index, eventsForDay, hasActiveFilters, renderedDays));
  });

  renderTimelineDots(dayCounts);
  renderQuickJumps();
  updateCategoryToggleState();
  updateHeroStats();
  updateSlide();
  window.EVENT_CONTEXT = { allEvents: state.allEvents, visibleEvents: getVisibleEvents() };
}

function bindFilterControls() {
  document.querySelectorAll(".scope-button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
    button.addEventListener("click", () => {
      document.querySelectorAll(".scope-button").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      document.querySelectorAll(".scope-button").forEach(item => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      state.filters.scope = button.dataset.scope || "all";
      state.slideIndex = getPreferredSlideIndex();
      void renderTimeline();
    });
  });

  document.getElementById("type-filter").addEventListener("change", event => {
    state.filters.type = event.target.value;
    state.slideIndex = getPreferredSlideIndex();
    void renderTimeline();
  });

  document.getElementById("venue-filter").addEventListener("change", event => {
    state.filters.venue = event.target.value;
    state.slideIndex = getPreferredSlideIndex();
    void renderTimeline();
  });

  document.getElementById("category-toggle-event")?.addEventListener("click", () => {
    const nextValue = !state.filters.showEvents;
    if (!nextValue && !state.filters.showVenues) {
      return;
    }

    state.filters.showEvents = nextValue;
    if (!state.filters.showEvents && !state.filters.showVenues) {
      state.filters.showVenues = true;
    }

    state.slideIndex = getPreferredSlideIndex();
    void renderTimeline();
  });

  document.getElementById("category-toggle-venue")?.addEventListener("click", () => {
    const nextValue = !state.filters.showVenues;
    if (!nextValue && !state.filters.showEvents) {
      return;
    }

    state.filters.showVenues = nextValue;
    if (!state.filters.showEvents && !state.filters.showVenues) {
      state.filters.showEvents = true;
    }

    state.slideIndex = getPreferredSlideIndex();
    void renderTimeline();
  });

  const jumpTodayButton = document.getElementById("jump-today");
  if (jumpTodayButton) {
    jumpTodayButton.addEventListener("click", () => {
      state.filters.scope = "today";
      document.querySelectorAll(".scope-button").forEach(button => {
        button.classList.toggle("active", button.dataset.scope === "today");
      });
      state.slideIndex = 0;
      void renderTimeline();
    });
  }

  document.getElementById("featured-event-open").addEventListener("click", () => {
    if (state.featuredEvent) {
      openModal(state.featuredEvent);
    }
  });
}

function bindNavigationControls() {
  const timelineContainer = document.getElementById("timeline-container");

  document.addEventListener("wheel", event => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      return;
    }

    if (!timelineContainer?.contains(event.target)) {
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
    button.setAttribute("aria-pressed", String(button.dataset.scope === state.filters.scope));
  });

  updateCategoryToggleState();
  await renderTimeline();
}

void initTimeline();

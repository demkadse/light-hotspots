const state = {
  slideIndex: 0,
  days: [],
  allEvents: [],
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

function buildDays() {
  const today = startOfDay(new Date());
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const days = [];

  const cursor = new Date(currentYear, currentMonth, 1);
  while (
    cursor.getMonth() === currentMonth &&
    cursor.getFullYear() === currentYear
  ) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  state.days = days;
}

function getTodayIndex() {
  const todayKey = getDayKey(startOfDay(new Date()));
  const index = state.days.findIndex(day => getDayKey(day) === todayKey);
  return index >= 0 ? index : 0;
}

function getDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
  if (index > 0 && day.getDate() === 1) return "Neuer Monat";
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
    return "";
  }

  const previousDay = state.days[index - 1];
  if (!previousDay) {
    return "";
  }

  if (previousDay.getMonth() !== day.getMonth()) {
    return `Monatswechsel zu ${day.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`;
  }

  return "";
}

function getEventType(event) {
  return (event.type || event.event_type || "").trim();
}

function eventMatchesFilters(event, day) {
  const { scope, type, venue } = state.filters;
  const dayStart = startOfDay(day);

  if (scope === "today" && dayStart.getTime() !== startOfDay(new Date()).getTime()) {
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
    .filter(event => eventMatchesFilters(event, day));
}

function updateHeroStats() {
  const todayKey = getDayKey(startOfDay(new Date()));
  const visibleEvents = state.allEvents.filter(event => {
    const eventDate = normalizeDateKey(event.date);
    const matchingDay = state.days.find(day => getDayKey(day) === eventDate);
    return matchingDay ? eventMatchesFilters(event, matchingDay) : false;
  });

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
}

function changeSlide(direction) {
  const nextIndex = Math.min(
    Math.max(state.slideIndex + direction, 0),
    Math.max(state.days.length - 1, 0)
  );

  if (nextIndex === state.slideIndex) {
    return;
  }

  state.slideIndex = nextIndex;
  updateSlide();
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
}

function renderDaySlide(day, index, eventsForDay, hasActiveFilters) {
  const slide = document.createElement("section");
  slide.className = "day-slide";

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

  header.append(copy, count);

  const carousel = createCarousel(eventsForDay, { isFiltered: hasActiveFilters });
  if (carousel.childElementCount > 0) {
    slide.append(header, carousel);
  } else {
    slide.appendChild(header);
  }

  return slide;
}

async function renderTimeline() {
  buildDays();

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
  updateHeroStats();
  updateSlide();
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

function setupSupportCta() {
  const koFiUrl = window.SITE_CONFIG?.koFiUrl;
  const link = document.getElementById("support-cta");

  if (!koFiUrl) {
    link.style.display = "none";
    return;
  }

  link.href = koFiUrl;
}

async function initTimeline() {
  setupHeroCta();
  setupSupportCta();
  buildDays();
  state.slideIndex = getTodayIndex();
  state.allEvents = await getAllIndexedEvents();
  populateFilterOptions();
  bindFilterControls();
  bindNavigationControls();
  await renderTimeline();
}

void initTimeline();

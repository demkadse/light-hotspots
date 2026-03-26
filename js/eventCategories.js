const VENUE_KEYWORDS = [
  "club",
  "clubs",
  "nightclub",
  "nightclubs",
  "nachtclub",
  "nachtclubs"
];

const EVENT_KEYWORDS = [
  "bar",
  "bars",
  "restaurant",
  "restaurants",
  "badehaus",
  "badehäuser",
  "badehaeuser",
  "teehaus",
  "teehäuser",
  "teehaeuser",
  "taverne",
  "tavernen"
];

function normalizeCategorySource(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase();
}

function includesKeyword(source, keywords) {
  return keywords.some(keyword => source.includes(keyword));
}

function classifyEventCategory(event) {
  const source = [
    event?.category,
    event?.type,
    event?.event_type,
    event?.venue
  ]
    .map(normalizeCategorySource)
    .filter(Boolean)
    .join(" ");

  if (includesKeyword(source, VENUE_KEYWORDS)) {
    return "venue";
  }

  if (includesKeyword(source, EVENT_KEYWORDS)) {
    return "event";
  }

  return "event";
}

function getEventCategoryLabel(event) {
  return classifyEventCategory(event) === "venue" ? "Venue" : "Event";
}

window.classifyEventCategory = classifyEventCategory;
window.getEventCategoryLabel = getEventCategoryLabel;

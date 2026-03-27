export const CATEGORY_OPTIONS = [
  { label: "Event", value: "event", description: "Klassische RP-Abende, Bars, Tavernen oder thematische Angebote." },
  { label: "Venue", value: "venue", description: "Clubs, Nightclubs und dauerhaft als Location gedachte Formate." }
];

export const SERVER_OPTIONS = [
  "Alpha",
  "Lich",
  "Odin",
  "Phoenix",
  "Raiden",
  "Shiva",
  "Twintania",
  "Zodiark"
].map(server => ({
  label: server,
  value: server,
  description: `Event auf ${server}.`
}));

export const RECURRENCE_OPTIONS = [
  { label: "Keine Wiederholung", value: "none", description: "Ein einzelner Termin ohne Wiederholung." },
  { label: "Woechentlich", value: "weekly", description: "Das Event wird jede Woche wiederholt." },
  { label: "Zweiwoechig", value: "biweekly", description: "Das Event wird alle zwei Wochen wiederholt." },
  { label: "Dreiwoechig", value: "triweekly", description: "Das Event wird alle drei Wochen wiederholt." }
];

const TYPE_OPTIONS = {
  event: [
    "Bar",
    "Restaurant",
    "Badehaus",
    "Teehaus",
    "Taverne",
    "Markt",
    "Salon",
    "Theater",
    "Casino",
    "Ausstellung",
    "Sonstiges Event"
  ],
  venue: [
    "Club",
    "Nightclub",
    "Lounge",
    "Tanzlokal",
    "Strandclub",
    "Eventhalle",
    "Sonstige Venue"
  ]
};

export function normalizeCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "venue" ? "venue" : normalized === "event" ? "event" : null;
}

export function normalizeRecurrence(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized || normalized === "none") {
    return null;
  }

  if (["weekly", "woechentlich", "wöchentlich"].includes(normalized)) {
    return "weekly";
  }

  if (["biweekly", "zweiwoechig", "zweiwöchig", "14taegig", "14tägig"].includes(normalized)) {
    return "biweekly";
  }

  if (["triweekly", "dreiwoechig", "dreiwöchig"].includes(normalized)) {
    return "triweekly";
  }

  return normalized;
}

export function getCategoryLabel(value) {
  return normalizeCategory(value) === "venue" ? "Venue" : "Event";
}

export function getRecurrenceLabel(value) {
  const normalized = normalizeRecurrence(value);

  if (normalized === "weekly") {
    return "Woechentlich";
  }

  if (normalized === "biweekly") {
    return "Zweiwoechig";
  }

  if (normalized === "triweekly") {
    return "Dreiwoechig";
  }

  return null;
}

export function getTypeOptions(category) {
  const normalizedCategory = normalizeCategory(category) || "event";

  return (TYPE_OPTIONS[normalizedCategory] || TYPE_OPTIONS.event).map(type => ({
    label: type,
    value: type,
    description: `${type} als Hauptformat.`
  }));
}

export function isTypeValidForCategory(type, category) {
  const normalizedType = String(type || "").trim();
  if (!normalizedType) {
    return false;
  }

  return getTypeOptions(category).some(option => option.value === normalizedType);
}

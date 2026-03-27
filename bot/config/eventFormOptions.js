export const CATEGORY_OPTIONS = [
  { label: "Event", value: "event", description: "Klassische RP-Abende, Bars, Tavernen oder thematische Angebote." },
  { label: "Venue", value: "venue", description: "Clubs, Nightclubs und dauerhaft als Location gedachte Formate." }
];

export const HOUSING_DISTRICT_OPTIONS = [
  { label: "Mist", value: "Mist", description: "La Noscea Wohngebiet." },
  { label: "The Lavender Beds", value: "The Lavender Beds", description: "Gridania Wohngebiet." },
  { label: "The Goblet", value: "The Goblet", description: "Ul'dah Wohngebiet." },
  { label: "Shirogane", value: "Shirogane", description: "Kugane Wohngebiet." },
  { label: "Empyreum", value: "Empyreum", description: "Ishgard Wohngebiet." }
];

export const HOUSING_PLOT_OPTIONS = Array.from({ length: 60 }, (_, index) => {
  const number = String(index + 1);
  return {
    label: `Haus ${number}`,
    value: number,
    description: `Grundstueck ${number}.`
  };
});

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

export function buildVenueLabel(district, plot) {
  const normalizedDistrict = String(district || "").trim();
  const normalizedPlot = String(plot || "").trim();

  if (!normalizedDistrict && !normalizedPlot) {
    return null;
  }

  if (!normalizedDistrict || !normalizedPlot) {
    return normalizedDistrict || `Haus ${normalizedPlot}`;
  }

  return `${normalizedDistrict} | Haus ${normalizedPlot}`;
}

export function parseVenueSelection(value) {
  const input = String(value || "").trim();
  const districtMatch = HOUSING_DISTRICT_OPTIONS.find(option => option.value === input);
  if (districtMatch) {
    return { district: districtMatch.value, plot: null };
  }

  const houseMatch = /^haus\s*(\d{1,2})$/i.exec(input) || /^(\d{1,2})$/.exec(input);
  if (houseMatch) {
    const plot = houseMatch[1];
    if (Number(plot) >= 1 && Number(plot) <= 60) {
      return { district: null, plot: String(Number(plot)) };
    }
  }

  const fullMatch = /^(.*?)\s*\|\s*haus\s*(\d{1,2})$/i.exec(input);
  if (fullMatch) {
    const district = fullMatch[1].trim();
    const plot = String(Number(fullMatch[2]));
    return { district, plot };
  }

  return { district: null, plot: null };
}

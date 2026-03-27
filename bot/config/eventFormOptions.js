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

export const HOUSING_WARD_OPTIONS = Array.from({ length: 30 }, (_, index) => {
  const number = String(index + 1);
  return {
    label: `Bezirk ${number}`,
    value: number,
    description: `Wohnbezirk ${number}.`
  };
});

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

export function buildVenueLabel(district, ward, plot) {
  const normalizedDistrict = String(district || "").trim();
  const normalizedWard = String(ward || "").trim();
  const normalizedPlot = String(plot || "").trim();

  if (!normalizedDistrict && !normalizedWard && !normalizedPlot) {
    return null;
  }

  const parts = [];
  if (normalizedDistrict) {
    parts.push(normalizedDistrict);
  }
  if (normalizedWard) {
    parts.push(`Bezirk ${normalizedWard}`);
  }
  if (normalizedPlot) {
    parts.push(`Haus ${normalizedPlot}`);
  }

  return parts.join(" | ");
}

export function parseVenueSelection(value) {
  const input = String(value || "").trim();
  const districtMatch = HOUSING_DISTRICT_OPTIONS.find(option => option.value === input);
  if (districtMatch) {
    return { district: districtMatch.value, ward: null, plot: null };
  }

  const wardMatch = /^bezirk\s*(\d{1,2})$/i.exec(input);
  if (wardMatch) {
    const ward = wardMatch[1];
    if (Number(ward) >= 1 && Number(ward) <= 30) {
      return { district: null, ward: String(Number(ward)), plot: null };
    }
  }

  const houseMatch = /^haus\s*(\d{1,2})$/i.exec(input) || /^(\d{1,2})$/.exec(input);
  if (houseMatch) {
    const plot = houseMatch[1];
    if (Number(plot) >= 1 && Number(plot) <= 60) {
      return { district: null, ward: null, plot: String(Number(plot)) };
    }
  }

  const fullMatch = /^(.*?)\s*\|\s*bezirk\s*(\d{1,2})\s*\|\s*haus\s*(\d{1,2})$/i.exec(input);
  if (fullMatch) {
    const district = fullMatch[1].trim();
    const ward = String(Number(fullMatch[2]));
    const plot = String(Number(fullMatch[3]));
    return { district, ward, plot };
  }

  const partialMatch = /^(.*?)\s*\|\s*haus\s*(\d{1,2})$/i.exec(input);
  if (partialMatch) {
    const district = partialMatch[1].trim();
    const plot = String(Number(partialMatch[2]));
    return { district, ward: null, plot };
  }

  return { district: null, ward: null, plot: null };
}

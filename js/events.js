const DATA_PATH = "events/data/";
const PLACEHOLDER_IMAGE_PATH = "placeholder.png";

let indexCache = null;
let indexLoadFailed = false;
const eventCache = new Map();

async function fetchJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Fetch fehlgeschlagen: ${path} (${response.status})`);
  }

  return response.json();
}

async function getIndex() {
  if (indexCache) return indexCache;

  try {
    const data = await fetchJson(DATA_PATH + "index.json");
    indexCache = Array.isArray(data.events) ? data.events : [];
    indexLoadFailed = false;
  } catch (error) {
    console.error("Index konnte nicht geladen werden:", error);
    indexCache = [];
    indexLoadFailed = true;
  }

  return indexCache;
}

async function getEvent(file) {
  if (eventCache.has(file)) {
    return eventCache.get(file);
  }

  try {
    const data = await fetchJson(DATA_PATH + file);
    eventCache.set(file, data);
    return data;
  } catch (error) {
    console.error(`Event konnte nicht geladen werden: ${file}`, error);
    return null;
  }
}

async function getAllIndexedEvents() {
  const index = await getIndex();
  const events = await Promise.all(index.map(entry => getEvent(entry.file)));
  return events.filter(Boolean);
}

function didIndexLoadFail() {
  return indexLoadFailed;
}

function getEventImageSource(event) {
  const image = typeof event?.image === "string" ? event.image.trim() : "";
  return image || PLACEHOLDER_IMAGE_PATH;
}

window.getEventImageSource = getEventImageSource;

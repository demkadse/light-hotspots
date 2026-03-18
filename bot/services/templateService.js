import fs from "fs/promises";
import path from "path";

const BASE_PATH = path.resolve("../events/data");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJSON(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDate(dateStr) {
  // erwartet DD.MM.YYYY
  const [day, month, year] = dateStr.split(".");
  return { day, month, year };
}

export async function approveTemplate(templateId) {

  const template = await getTemplate(templateId); // deine bestehende Funktion

  const { day, month, year } = parseDate(template.date);

  const slug = slugify(template.title);

  const fileName = `${slug}-${year}-${month}-${day}.json`;

  const dirPath = path.join(BASE_PATH, year, month);
  const filePath = path.join(dirPath, fileName);

  await ensureDir(dirPath);

  const eventData = {
    id: slug,
    title: template.title,
    type: template.type || "event",
    venue: template.venue,
    host: template.created_by,
    date: `${year}-${month}-${day}`,
    start_time: template.time,
    end_time: null,
    image: template.image,
    description: template.description,
    links: [],
    created_by: template.created_by,
    created_at: new Date().toISOString()
  };

  // =========================
  // EVENT DATEI
  // =========================

  await writeJSON(filePath, eventData);

  // =========================
  // INDEX PFLEGE
  // =========================

  const indexPath = path.join(BASE_PATH, "index.json");

  let index = await readJSON(indexPath);

  if (!index) {
    index = { events: [] };
  }

  const relativeFile = `${year}/${month}/${fileName}`;

  const existingIndex = index.events.findIndex(e => e.file === relativeFile);

  if (existingIndex !== -1) {
    // 🔁 UPDATE (z. B. Datum geändert)
    index.events[existingIndex].date = eventData.date;
  } else {
    // ➕ NEU
    index.events.push({
      file: relativeFile,
      date: eventData.date
    });
  }

  await writeJSON(indexPath, index);

  return eventData;
}
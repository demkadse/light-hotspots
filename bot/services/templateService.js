import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { syncRepoFiles } from "./gitSyncService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(BOT_ROOT, "..");

const TEMPLATE_PATH = path.join(BOT_ROOT, "data", "templates.json");
const EVENTS_BASE_PATH = path.join(REPO_ROOT, "events", "data");

// =========================
// HELPERS
// =========================

async function ensureFile(filePath, defaultContent = "[]") {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, defaultContent, "utf-8");
  }
}

async function readJSON(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function readTemplates() {
  await ensureFile(TEMPLATE_PATH);
  return readJSON(TEMPLATE_PATH, []);
}

async function writeTemplates(templates) {
  await writeJSON(TEMPLATE_PATH, templates);
}

export async function getAllTemplates() {
  return readTemplates();
}

async function readEventIndex() {
  const indexPath = path.join(EVENTS_BASE_PATH, "index.json");
  const index = await readJSON(indexPath, { events: [] });
  return { indexPath, index };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split(".");
  return { day, month, year };
}

function buildPublishedFileInfo(template) {
  const { day, month, year } = parseDate(template.date);
  const slug = slugify(template.title);
  const fileName = `${slug}-${year}-${month}-${day}.json`;
  const file = `${year}/${month}/${fileName}`;
  const filePath = path.join(EVENTS_BASE_PATH, file);

  return {
    day,
    month,
    year,
    slug,
    fileName,
    file,
    filePath
  };
}

export async function findPotentialDuplicates(event, limit = 3) {
  const { index } = await readEventIndex();
  const title = event.title?.trim().toLowerCase();
  const venue = event.venue?.trim().toLowerCase();
  const date = event.date?.includes(".")
    ? (() => {
        const { day, month, year } = parseDate(event.date);
        return `${year}-${month}-${day}`;
      })()
    : event.date;

  const duplicates = [];

  for (const entry of index.events) {
    if (entry.date !== date) continue;

    const publishedEvent = await readJSON(path.join(EVENTS_BASE_PATH, entry.file), null);
    if (!publishedEvent) continue;

    const titleMatch = publishedEvent.title?.trim().toLowerCase() === title;
    const venueMatch = publishedEvent.venue?.trim().toLowerCase() === venue;

    if (!titleMatch && !venueMatch) continue;

    duplicates.push({
      title: publishedEvent.title,
      venue: publishedEvent.venue,
      date: publishedEvent.date,
      file: entry.file
    });

    if (duplicates.length >= limit) break;
  }

  return duplicates;
}

export async function processPendingReminders({
  thresholdHours = 24,
  reminderGapHours = 24
} = {}) {
  const templates = await readTemplates();
  const now = Date.now();
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  const reminderGapMs = reminderGapHours * 60 * 60 * 1000;
  const reminded = [];

  for (let index = 0; index < templates.length; index += 1) {
    const template = templates[index];

    if (template.status !== "pending") {
      continue;
    }

    const referenceTime = template.updated_at || template.created_at;
    if (!referenceTime) {
      continue;
    }

    const ageMs = now - new Date(referenceTime).getTime();
    if (ageMs < thresholdMs) {
      continue;
    }

    if (template.reminder_sent_at) {
      const reminderAge = now - new Date(template.reminder_sent_at).getTime();
      if (reminderAge < reminderGapMs) {
        continue;
      }
    }

    templates[index] = {
      ...template,
      reminder_sent_at: new Date(now).toISOString()
    };

    reminded.push(templates[index]);
  }

  if (reminded.length === 0) {
    return [];
  }

  await writeTemplates(templates);
  await syncRepoFiles(
    [TEMPLATE_PATH],
    `Update pending reminders ${new Date(now).toISOString()}`
  );

  return reminded;
}

export async function resyncEventIndex({ applyFixes = false } = {}) {
  const eventFiles = [];

  async function walk(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.name.endsWith(".json") || entry.name === "index.json") {
        continue;
      }

      eventFiles.push(fullPath);
    }
  }

  await walk(EVENTS_BASE_PATH);

  const actualEntries = [];
  for (const filePath of eventFiles) {
    const event = await readJSON(filePath, null);
    if (!event?.date) {
      continue;
    }

    const relativeFile = path.relative(EVENTS_BASE_PATH, filePath).replace(/\\/g, "/");
    actualEntries.push({
      file: relativeFile,
      date: event.date
    });
  }

  actualEntries.sort((a, b) => a.file.localeCompare(b.file));

  const { indexPath, index } = await readEventIndex();
  const existingEntries = [...index.events].sort((a, b) => a.file.localeCompare(b.file));

  const missingFromIndex = actualEntries.filter(
    actual => !existingEntries.some(existing => existing.file === actual.file)
  );
  const staleInIndex = existingEntries.filter(
    existing => !actualEntries.some(actual => actual.file === existing.file)
  );
  const dateMismatches = actualEntries.filter(actual => {
    const existing = existingEntries.find(entry => entry.file === actual.file);
    return existing && existing.date !== actual.date;
  });

  if (applyFixes) {
    await writeJSON(indexPath, { events: actualEntries });
    await syncRepoFiles(
      [indexPath],
      "Resync events index"
    );
  }

  return {
    missingFromIndex,
    staleInIndex,
    dateMismatches,
    totalActual: actualEntries.length,
    totalIndexed: existingEntries.length,
    appliedFixes: applyFixes
  };
}

// =========================
// TEMPLATE CRUD
// =========================

export async function createOrUpdateTemplate(data, userId, templateId = null) {
  const templates = await readTemplates();

  if (templateId) {
    const index = templates.findIndex(t => t.id === templateId);
    if (index === -1) throw new Error("Template nicht gefunden");

    templates[index] = {
      ...templates[index],
      ...data,
      updated_at: new Date().toISOString()
    };

    await writeTemplates(templates);
    await syncRepoFiles(
      [TEMPLATE_PATH],
      `Update event template ${templates[index].id}`
    );
    return templates[index];
  }

  const newTemplate = {
    id: crypto.randomUUID(),
    ...data,
    created_by: userId,
    status: "draft",
    created_at: new Date().toISOString()
  };

  templates.push(newTemplate);
  await writeTemplates(templates);
  await syncRepoFiles(
    [TEMPLATE_PATH],
    `Create event template ${newTemplate.id}`
  );

  return newTemplate;
}

export async function getTemplatesByUser(userId) {
  const templates = await readTemplates();
  return templates.filter(template => template.created_by === userId);
}

export async function getTemplate(templateId) {
  const templates = await readTemplates();
  return templates.find(t => t.id === templateId);
}

export async function submitTemplateForApproval(templateId) {
  const templates = await readTemplates();
  const index = templates.findIndex(template => template.id === templateId);

  if (index === -1) {
    throw new Error("Template nicht gefunden");
  }

  templates[index] = {
    ...templates[index],
    status: "pending",
    rejection_reason: null,
    updated_at: new Date().toISOString()
  };

  await writeTemplates(templates);
  await syncRepoFiles(
    [TEMPLATE_PATH],
    `Submit event template ${templates[index].id}`
  );
  return templates[index];
}

export async function rejectTemplate(templateId, reason) {
  const templates = await readTemplates();
  const index = templates.findIndex(template => template.id === templateId);

  if (index === -1) {
    throw new Error("Template nicht gefunden");
  }

  templates[index] = {
    ...templates[index],
    status: "rejected",
    rejection_reason: reason,
    updated_at: new Date().toISOString()
  };

  await writeTemplates(templates);
  await syncRepoFiles(
    [TEMPLATE_PATH],
    `Reject event template ${templates[index].id}`
  );
  return templates[index];
}

// =========================
// APPROVE + EVENT + INDEX
// =========================

export async function approveTemplate(templateId) {
  const templates = await readTemplates();
  const templateIndex = templates.findIndex(t => t.id === templateId);
  const template = templates[templateIndex];

  if (!template) {
    throw new Error("Template nicht gefunden");
  }

  const { day, month, year, slug, fileName, file, filePath } = buildPublishedFileInfo(template);

  const dirPath = path.join(EVENTS_BASE_PATH, year, month);

  await fs.mkdir(dirPath, { recursive: true });

  const eventData = {
    id: slug,
    title: template.title,
    type: template.event_type || template.type || "event",
    venue: template.venue,
    host: template.host_display_name || template.host || template.created_by,
    venue_lead: template.venue_lead || null,
    date: `${year}-${month}-${day}`,
    start_time: template.time,
    end_time: template.end_time || null,
    image: template.image || null,
    description: template.description,
    link: template.link || null,
    links: template.link ? [template.link] : [],
    notes: template.notes || null,
    created_by: template.created_by,
    created_at: new Date().toISOString()
  };

  eventData.file = file;

  await writeJSON(filePath, eventData);

  // =========================
  // INDEX
  // =========================

  const { indexPath, index } = await readEventIndex();
  const relativeFile = eventData.file;

  const existing = index.events.find(e => e.file === relativeFile);

  if (existing) {
    existing.date = eventData.date;
  } else {
    index.events.push({
      file: relativeFile,
      date: eventData.date
    });
  }

  await writeJSON(indexPath, index);

  templates[templateIndex] = {
    ...template,
    status: "approved",
    rejection_reason: null,
    updated_at: new Date().toISOString()
  };

  await writeTemplates(templates);
  await syncRepoFiles(
    [TEMPLATE_PATH, indexPath, filePath],
    `Publish event ${eventData.file}`
  );

  return eventData;
}

export async function unpublishTemplate(templateId) {
  const templates = await readTemplates();
  const templateIndex = templates.findIndex(t => t.id === templateId);
  const template = templates[templateIndex];

  if (!template) {
    throw new Error("Template nicht gefunden");
  }

  const fileInfo = buildPublishedFileInfo(template);
  const { indexPath, index } = await readEventIndex();

  try {
    await fs.unlink(fileInfo.filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  index.events = index.events.filter(entry => entry.file !== fileInfo.file);
  await writeJSON(indexPath, index);

  templates[templateIndex] = {
    ...template,
    status: "unpublished",
    updated_at: new Date().toISOString()
  };

  await writeTemplates(templates);
  await syncRepoFiles(
    [TEMPLATE_PATH, indexPath, fileInfo.filePath],
    `Unpublish event ${fileInfo.file}`
  );

  return {
    title: template.title,
    file: fileInfo.file
  };
}

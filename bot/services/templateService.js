import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { syncRepoFiles } from "./gitSyncService.js";
import {
  buildUserIdentityFields,
  matchesUserHash,
  rememberTemplateOwner,
  sanitizeTemplatesForStorage
} from "./identityService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(BOT_ROOT, "..");

const TEMPLATE_PATH = path.join(BOT_ROOT, "data", "templates.json");
const EVENTS_BASE_PATH = path.join(REPO_ROOT, "events", "data");
const RECURRING_WEEKS = 26;

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
  const templates = await readJSON(TEMPLATE_PATH, []);
  const sanitized = await sanitizeTemplatesForStorage(templates);

  if (sanitized.changed) {
    await writeJSON(TEMPLATE_PATH, sanitized.templates);
  }

  return sanitized.templates;
}

async function writeTemplates(templates) {
  const sanitized = await sanitizeTemplatesForStorage(templates);
  await writeJSON(TEMPLATE_PATH, sanitized.templates);
}

function normalizeTemplateField(value) {
  return (value || "").trim().toLowerCase();
}

function isReusableDraftTemplate(template) {
  return template.status === "draft" || template.status === "rejected";
}

function hasSameCoreContent(template, data) {
  return normalizeTemplateField(template.title) === normalizeTemplateField(data.title) &&
    normalizeTemplateField(template.venue) === normalizeTemplateField(data.venue) &&
    normalizeTemplateField(template.date) === normalizeTemplateField(data.date) &&
    normalizeTemplateField(template.time) === normalizeTemplateField(data.time) &&
    normalizeTemplateField(template.description) === normalizeTemplateField(data.description);
}

export async function getAllTemplates() {
  return readTemplates();
}

export async function getPublishedTemplates() {
  const templates = await readTemplates();
  return templates.filter(template =>
    ["approved", "cancelled"].includes(template.status) ||
    (Array.isArray(template.published_files) && template.published_files.length > 0)
  );
}

async function readEventIndex() {
  const indexPath = path.join(EVENTS_BASE_PATH, "index.json");
  const index = await readJSON(indexPath, { events: [] });
  return { indexPath, index };
}

async function resolvePublishedFilesForTemplate(template, existingIndex = null) {
  if (template.published_files?.length) {
    return template.published_files;
  }

  const { index } = existingIndex ? { index: existingIndex } : await readEventIndex();
  const templateDate = template.date?.includes(".")
    ? (() => {
        const { day, month, year } = parseDate(template.date);
        return `${year}-${month}-${day}`;
      })()
    : template.date;

  const matches = [];

  for (const entry of index.events) {
    if (entry.date !== templateDate) {
      continue;
    }

    const event = await readJSON(path.join(EVENTS_BASE_PATH, entry.file), null);
    if (!event) {
      continue;
    }

    if (
      normalizeTemplateField(event.title) === normalizeTemplateField(template.title) &&
      normalizeTemplateField(event.venue) === normalizeTemplateField(template.venue)
    ) {
      matches.push(entry.file);
    }
  }

  return matches.length > 0 ? matches : [buildPublishedFileInfo(template).file];
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

function formatDateParts(date) {
  return {
    day: String(date.getUTCDate()).padStart(2, "0"),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    year: String(date.getUTCFullYear())
  };
}

function parseTemplateDateToUtc(dateStr) {
  const { day, month, year } = parseDate(dateStr);
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function getOccurrenceDates(template) {
  const startDate = parseTemplateDateToUtc(template.date);
  const dates = [startDate];

  if (template.recurrence_rule !== "weekly") {
    return dates;
  }

  for (let index = 1; index < RECURRING_WEEKS; index += 1) {
    const nextDate = new Date(startDate);
    nextDate.setUTCDate(startDate.getUTCDate() + index * 7);
    dates.push(nextDate);
  }

  return dates;
}

function buildPublishedFileInfo(template, occurrenceDate = parseTemplateDateToUtc(template.date), occurrenceIndex = 0) {
  const { day, month, year } = formatDateParts(occurrenceDate);
  const slug = slugify(template.title);
  const templateSuffix = template.id ? `-${template.id.slice(0, 8)}` : "";
  const recurringSuffix = template.recurrence_rule === "weekly" ? `-${String(occurrenceIndex + 1).padStart(2, "0")}` : "";
  const fileName = `${slug}-${year}-${month}-${day}${templateSuffix}${recurringSuffix}.json`;
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
      recurrence_rule: data.recurrence_rule ?? templates[index].recurrence_rule ?? null,
      updated_at: new Date().toISOString()
    };

    await writeTemplates(templates);
    await rememberTemplateOwner(templates[index].id, userId);
    await syncRepoFiles(
      [TEMPLATE_PATH],
      `Update event template ${templates[index].id}`
    );
    return templates[index];
  }

  const newTemplate = {
    id: crypto.randomUUID(),
    ...data,
    recurrence_rule: data.recurrence_rule ?? null,
    ...buildUserIdentityFields(userId),
    status: "draft",
    created_at: new Date().toISOString()
  };

  templates.push(newTemplate);
  await writeTemplates(templates);
  await rememberTemplateOwner(newTemplate.id, userId);
  await syncRepoFiles(
    [TEMPLATE_PATH],
    `Create event template ${newTemplate.id}`
  );

  return newTemplate;
}

export async function getTemplatesByUser(userId) {
  const templates = await readTemplates();
  return templates.filter(template => matchesUserHash(template, userId));
}

export async function getTemplate(templateId) {
  const templates = await readTemplates();
  return templates.find(t => t.id === templateId);
}

export async function findReusableTemplateDraft(userId, data, withinMinutes = 180) {
  const templates = await readTemplates();
  const cutoffMs = withinMinutes * 60 * 1000;
  const now = Date.now();

  return templates
    .filter(template => matchesUserHash(template, userId))
    .filter(isReusableDraftTemplate)
    .filter(template => hasSameCoreContent(template, data))
    .filter(template => {
      const referenceTime = template.updated_at || template.created_at;
      if (!referenceTime) {
        return false;
      }

      return now - new Date(referenceTime).getTime() <= cutoffMs;
    })
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0] || null;
}

export async function submitTemplateForApproval(templateId) {
  const templates = await readTemplates();
  const index = templates.findIndex(template => template.id === templateId);

  if (index === -1) {
    throw new Error("Template nicht gefunden");
  }

  if (!templates[index].server?.trim()) {
    throw new Error("Server fehlt. Bitte ergänze den Server in den Details, bevor du das Event einreichst.");
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

  const occurrenceDates = getOccurrenceDates(template);
  const publishedFiles = [];
  const syncedPaths = [];
  let firstEventData = null;

  // =========================
  // INDEX
  // =========================

  const { indexPath, index } = await readEventIndex();

  for (let occurrenceIndex = 0; occurrenceIndex < occurrenceDates.length; occurrenceIndex += 1) {
    const occurrenceDate = occurrenceDates[occurrenceIndex];
    const { day, month, year, slug, file, filePath } = buildPublishedFileInfo(template, occurrenceDate, occurrenceIndex);
    const dirPath = path.join(EVENTS_BASE_PATH, year, month);

    await fs.mkdir(dirPath, { recursive: true });

    const eventData = {
      id: template.recurrence_rule === "weekly" ? `${slug}-${year}${month}${day}` : slug,
      series_id: template.recurrence_rule === "weekly" ? `${template.id}:weekly` : null,
      occurrence_index: template.recurrence_rule === "weekly" ? occurrenceIndex : 0,
      recurrence_rule: template.recurrence_rule || null,
      title: template.title,
      type: template.event_type || template.type || "event",
      venue: template.venue,
      server: template.server || null,
      host: template.host_display_name || template.host || "Unbekannt",
      venue_lead: template.venue_lead || null,
      date: `${year}-${month}-${day}`,
      start_time: template.time,
      end_time: template.end_time || null,
      image: template.image || null,
      description: template.description,
      discord_link: template.discord_link || null,
      link: template.link || null,
      links: [template.discord_link, template.link].filter(Boolean),
      notes: template.notes || null,
      status: "scheduled",
      created_by_hash: template.created_by_hash || null,
      created_at: new Date().toISOString(),
      file
    };

    await writeJSON(filePath, eventData);
    syncedPaths.push(filePath);
    publishedFiles.push(file);

    const existing = index.events.find(e => e.file === file);
    if (existing) {
      existing.date = eventData.date;
    } else {
      index.events.push({
        file,
        date: eventData.date
      });
    }

    if (!firstEventData) {
      firstEventData = eventData;
    }
  }

  await writeJSON(indexPath, index);

  templates[templateIndex] = {
    ...template,
    status: "approved",
    published_files: publishedFiles,
    rejection_reason: null,
    updated_at: new Date().toISOString()
  };

  await writeTemplates(templates);
  await syncRepoFiles(
    [TEMPLATE_PATH, indexPath, ...syncedPaths],
    `Publish event ${publishedFiles[0]}`
  );

  return {
    ...firstEventData,
    published_files: publishedFiles
  };
}

export async function unpublishTemplate(templateId) {
  const templates = await readTemplates();
  const templateIndex = templates.findIndex(t => t.id === templateId);
  const template = templates[templateIndex];

  if (!template) {
    throw new Error("Template nicht gefunden");
  }

  const { indexPath, index } = await readEventIndex();
  const publishedFiles = await resolvePublishedFilesForTemplate(template, index);
  const changedPaths = [];

  for (const file of publishedFiles) {
    const filePath = path.join(EVENTS_BASE_PATH, file);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    changedPaths.push(filePath);
  }

  index.events = index.events.filter(entry => !publishedFiles.includes(entry.file));
  await writeJSON(indexPath, index);

  templates[templateIndex] = {
    ...template,
    status: "unpublished",
    published_files: [],
    updated_at: new Date().toISOString()
  };

  await writeTemplates(templates);
  await syncRepoFiles(
    [TEMPLATE_PATH, indexPath, ...changedPaths],
    `Unpublish event ${publishedFiles[0]}`
  );

  return {
    title: template.title,
    file: publishedFiles[0]
  };
}

export async function cancelPublishedTemplate(templateId) {
  const templates = await readTemplates();
  const templateIndex = templates.findIndex(t => t.id === templateId);
  const template = templates[templateIndex];

  if (!template) {
    throw new Error("Template nicht gefunden");
  }

  const { index } = await readEventIndex();
  const publishedFiles = await resolvePublishedFilesForTemplate(template, index);
  const changedPaths = [];

  for (const file of publishedFiles) {
    const filePath = path.join(EVENTS_BASE_PATH, file);
    const event = await readJSON(filePath, null);

    if (!event) {
      continue;
    }

    await writeJSON(filePath, {
      ...event,
      status: "cancelled",
      cancelled_at: new Date().toISOString()
    });
    changedPaths.push(filePath);
  }

  templates[templateIndex] = {
    ...template,
    status: "cancelled",
    updated_at: new Date().toISOString()
  };

  await writeTemplates(templates);
  await syncRepoFiles(
    [TEMPLATE_PATH, ...changedPaths],
    `Cancel event ${publishedFiles[0]}`
  );

  return {
    title: template.title,
    published_files: publishedFiles
  };
}

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

  const { day, month, year } = parseDate(template.date);

  const slug = slugify(template.title);
  const fileName = `${slug}-${year}-${month}-${day}.json`;

  const dirPath = path.join(EVENTS_BASE_PATH, year, month);
  const filePath = path.join(dirPath, fileName);

  await fs.mkdir(dirPath, { recursive: true });

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

  eventData.file = `${year}/${month}/${fileName}`;

  await writeJSON(filePath, eventData);

  // =========================
  // INDEX
  // =========================

  const indexPath = path.join(EVENTS_BASE_PATH, "index.json");

  let index = await readJSON(indexPath, { events: [] });

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

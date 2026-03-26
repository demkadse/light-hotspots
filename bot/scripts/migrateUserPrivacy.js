import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { hashDiscordUserId, rememberTemplateOwner } from "../services/identityService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(BOT_ROOT, "..");
const TEMPLATE_PATH = path.join(BOT_ROOT, "data", "templates.json");
const AUDIT_LOG_PATH = path.join(BOT_ROOT, "data", "audit-log.json");
const LEGACY_EVENTS_PATH = path.join(BOT_ROOT, "data", "events.json");
const EVENTS_BASE_PATH = path.join(REPO_ROOT, "events", "data");

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function migrateTemplates() {
  const templates = await readJson(TEMPLATE_PATH, []);
  let changed = false;

  for (const template of templates) {
    if (!template?.id || !template?.created_by || template.created_by_hash) {
      continue;
    }

    await rememberTemplateOwner(template.id, template.created_by);
    template.created_by_hash = hashDiscordUserId(template.created_by);
    delete template.created_by;
    changed = true;
  }

  if (changed) {
    await writeJson(TEMPLATE_PATH, templates);
  }

  return changed;
}

async function migrateAuditLog() {
  const entries = await readJson(AUDIT_LOG_PATH, []);
  let changed = false;

  for (const entry of entries) {
    if (!entry?.actor_id || entry.actor_hash) {
      continue;
    }

    entry.actor_hash = hashDiscordUserId(entry.actor_id);
    delete entry.actor_id;
    changed = true;
  }

  if (changed) {
    await writeJson(AUDIT_LOG_PATH, entries);
  }

  return changed;
}

async function migrateLegacyEventsFile() {
  const events = await readJson(LEGACY_EVENTS_PATH, []);
  let changed = false;

  for (const event of events) {
    if (!event?.created_by || event.created_by_hash) {
      continue;
    }

    if (/^\d{17,20}$/.test(String(event.created_by))) {
      event.created_by_hash = hashDiscordUserId(event.created_by);
    } else {
      event.created_by_hash = "legacy-non-discord";
    }

    delete event.created_by;
    changed = true;
  }

  if (changed) {
    await writeJson(LEGACY_EVENTS_PATH, events);
  }

  return changed;
}

async function migratePublishedEvents() {
  const changedFiles = [];

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

      const event = await readJson(fullPath, null);
      if (!event?.created_by || event.created_by_hash) {
        continue;
      }

      if (/^\d{17,20}$/.test(String(event.created_by))) {
        event.created_by_hash = hashDiscordUserId(event.created_by);
      } else {
        event.created_by_hash = "legacy-non-discord";
      }

      delete event.created_by;
      await writeJson(fullPath, event);
      changedFiles.push(path.relative(REPO_ROOT, fullPath).replace(/\\/g, "/"));
    }
  }

  await walk(EVENTS_BASE_PATH);
  return changedFiles;
}

async function main() {
  const templatesChanged = await migrateTemplates();
  const auditChanged = await migrateAuditLog();
  const legacyEventsChanged = await migrateLegacyEventsFile();
  const publishedEventFiles = await migratePublishedEvents();

  console.log(JSON.stringify({
    templatesChanged,
    auditChanged,
    legacyEventsChanged,
    publishedEventFiles
  }, null, 2));
}

await main();

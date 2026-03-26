import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { CONFIG } from "../config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, "..");
const PRIVATE_USER_MAP_PATH = path.join(BOT_ROOT, "data", "private-user-map.json");

function normalizeDiscordUserId(userId) {
  const normalized = String(userId || "").trim();
  return /^\d{17,20}$/.test(normalized) ? normalized : null;
}

function createUserHash(userId) {
  const normalized = normalizeDiscordUserId(userId);
  if (!normalized) {
    return null;
  }

  return crypto
    .createHmac("sha256", CONFIG.USER_ID_HASH_SECRET)
    .update(`discord-user:${normalized}`)
    .digest("hex");
}

async function ensurePrivateUserMap() {
  const dirPath = path.dirname(PRIVATE_USER_MAP_PATH);
  await fs.mkdir(dirPath, { recursive: true });

  try {
    await fs.access(PRIVATE_USER_MAP_PATH);
  } catch {
    await fs.writeFile(PRIVATE_USER_MAP_PATH, JSON.stringify({ templates: {} }, null, 2), "utf-8");
  }
}

async function readPrivateUserMap() {
  await ensurePrivateUserMap();

  try {
    const raw = await fs.readFile(PRIVATE_USER_MAP_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      templates: parsed?.templates && typeof parsed.templates === "object" ? parsed.templates : {}
    };
  } catch {
    return { templates: {} };
  }
}

async function writePrivateUserMap(data) {
  await ensurePrivateUserMap();
  await fs.writeFile(PRIVATE_USER_MAP_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function hashDiscordUserId(userId) {
  const hash = createUserHash(userId);
  if (!hash) {
    throw new Error("Ungültige Discord-User-ID für Hashing");
  }

  return hash;
}

export function buildUserIdentityFields(userId) {
  return {
    created_by_hash: hashDiscordUserId(userId)
  };
}

export function matchesUserHash(template, userId) {
  const hashedUserId = createUserHash(userId);
  if (!hashedUserId) {
    return false;
  }

  if (template.created_by_hash) {
    return template.created_by_hash === hashedUserId;
  }

  return normalizeDiscordUserId(template.created_by) === normalizeDiscordUserId(userId);
}

export async function rememberTemplateOwner(templateId, userId) {
  const normalized = normalizeDiscordUserId(userId);
  if (!templateId || !normalized) {
    return;
  }

  const map = await readPrivateUserMap();
  if (map.templates[templateId] === normalized) {
    return;
  }

  map.templates[templateId] = normalized;
  await writePrivateUserMap(map);
}

export async function getTemplateOwnerId(template) {
  const legacyUserId = normalizeDiscordUserId(template?.created_by);
  if (legacyUserId) {
    if (template?.id) {
      await rememberTemplateOwner(template.id, legacyUserId);
    }

    return legacyUserId;
  }

  if (!template?.id) {
    return null;
  }

  const map = await readPrivateUserMap();
  return normalizeDiscordUserId(map.templates[template.id]);
}

export async function sanitizeTemplatesForStorage(templates) {
  let changed = false;
  const sanitized = [];

  for (const template of templates) {
    const nextTemplate = { ...template };
    const legacyUserId = normalizeDiscordUserId(nextTemplate.created_by);

    if (legacyUserId) {
      await rememberTemplateOwner(nextTemplate.id, legacyUserId);
      nextTemplate.created_by_hash = createUserHash(legacyUserId);
      delete nextTemplate.created_by;
      changed = true;
    }

    sanitized.push(nextTemplate);
  }

  return { templates: sanitized, changed };
}

export async function sanitizeAuditEntriesForStorage(entries) {
  let changed = false;
  const sanitized = entries.map(entry => {
    const nextEntry = { ...entry };
    const actorId = normalizeDiscordUserId(nextEntry.actor_id);

    if (actorId) {
      nextEntry.actor_hash = createUserHash(actorId);
      delete nextEntry.actor_id;
      changed = true;
    }

    return nextEntry;
  });

  return { entries: sanitized, changed };
}

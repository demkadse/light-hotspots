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

function normalizeDiscordUserIds(userIds) {
  if (!Array.isArray(userIds)) {
    return [];
  }

  return [...new Set(
    userIds
      .map(normalizeDiscordUserId)
      .filter(Boolean)
  )];
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

export function buildAdditionalEditorIdentityFields(userIds = []) {
  return {
    editable_by_hashes: normalizeDiscordUserIds(userIds).map(hashDiscordUserId)
  };
}

export function matchesUserHash(template, userId) {
  const hashedUserId = createUserHash(userId);
  if (!hashedUserId) {
    return false;
  }

  if (template.created_by_hash) {
    if (template.created_by_hash === hashedUserId) {
      return true;
    }
  } else if (normalizeDiscordUserId(template.created_by) === normalizeDiscordUserId(userId)) {
    return true;
  }

  return Array.isArray(template.editable_by_hashes) && template.editable_by_hashes.includes(hashedUserId);
}

export function isTemplateOwner(template, userId) {
  const hashedUserId = createUserHash(userId);
  if (!hashedUserId) {
    return false;
  }

  if (template?.created_by_hash) {
    return template.created_by_hash === hashedUserId;
  }

  return normalizeDiscordUserId(template?.created_by) === normalizeDiscordUserId(userId);
}

export async function rememberTemplateOwner(templateId, userId) {
  const normalized = normalizeDiscordUserId(userId);
  if (!templateId || !normalized) {
    return;
  }

  const map = await readPrivateUserMap();
  const existingEntry = map.templates[templateId];
  const nextEntry = typeof existingEntry === "string"
    ? { owner_id: existingEntry, editor_ids: [] }
    : {
        owner_id: normalizeDiscordUserId(existingEntry?.owner_id),
        editor_ids: normalizeDiscordUserIds(existingEntry?.editor_ids)
      };

  if (nextEntry.owner_id === normalized) {
    return;
  }

  map.templates[templateId] = {
    owner_id: normalized,
    editor_ids: nextEntry.editor_ids
  };
  await writePrivateUserMap(map);
}

export async function rememberTemplateEditors(templateId, userIds = []) {
  if (!templateId) {
    return;
  }

  const normalizedEditors = normalizeDiscordUserIds(userIds);
  const map = await readPrivateUserMap();
  const existingEntry = map.templates[templateId];
  const nextEntry = typeof existingEntry === "string"
    ? { owner_id: existingEntry, editor_ids: [] }
    : {
        owner_id: normalizeDiscordUserId(existingEntry?.owner_id),
        editor_ids: normalizeDiscordUserIds(existingEntry?.editor_ids)
      };

  const sameEditors = nextEntry.editor_ids.length === normalizedEditors.length &&
    nextEntry.editor_ids.every((value, index) => value === normalizedEditors[index]);

  if (sameEditors) {
    return;
  }

  map.templates[templateId] = {
    owner_id: nextEntry.owner_id,
    editor_ids: normalizedEditors
  };
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
  const entry = map.templates[template.id];
  if (typeof entry === "string") {
    return normalizeDiscordUserId(entry);
  }

  return normalizeDiscordUserId(entry?.owner_id);
}

export async function getTemplateEditorIds(template) {
  if (!template?.id) {
    return [];
  }

  const map = await readPrivateUserMap();
  const entry = map.templates[template.id];
  if (typeof entry === "string") {
    return [];
  }

  return normalizeDiscordUserIds(entry?.editor_ids);
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

    const legacyEditors = normalizeDiscordUserIds(nextTemplate.editable_by);
    if (legacyEditors.length > 0) {
      await rememberTemplateEditors(nextTemplate.id, legacyEditors);
      nextTemplate.editable_by_hashes = legacyEditors.map(createUserHash).filter(Boolean);
      delete nextTemplate.editable_by;
      changed = true;
    }

    const normalizedEditorHashes = Array.isArray(nextTemplate.editable_by_hashes)
      ? [...new Set(nextTemplate.editable_by_hashes.filter(value => typeof value === "string" && value.length > 0))]
      : [];

    if (normalizedEditorHashes.length !== (nextTemplate.editable_by_hashes?.length || 0)) {
      nextTemplate.editable_by_hashes = normalizedEditorHashes;
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

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { CHANNELS } from "../config/channels.js";
import { sanitizeAuditEntriesForStorage } from "./identityService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, "..");
const AUDIT_LOG_PATH = path.join(BOT_ROOT, "data", "audit-log.json");

async function ensureAuditLog() {
  try {
    await fs.access(AUDIT_LOG_PATH);
  } catch {
    await fs.writeFile(AUDIT_LOG_PATH, "[]", "utf-8");
  }
}

async function readAuditLog() {
  await ensureAuditLog();
  const raw = await fs.readFile(AUDIT_LOG_PATH, "utf-8");
  const entries = JSON.parse(raw);
  const sanitized = await sanitizeAuditEntriesForStorage(entries);

  if (sanitized.changed) {
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(sanitized.entries, null, 2), "utf-8");
  }

  return sanitized.entries;
}

async function writeAuditLog(entries) {
  const sanitized = await sanitizeAuditEntriesForStorage(entries);
  await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(sanitized.entries, null, 2), "utf-8");
}

export async function recordAuditEntry(client, entry) {
  const actorId = entry.actor_id || null;
  const auditEntry = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...entry
  };

  const entries = await readAuditLog();
  entries.push(auditEntry);
  await writeAuditLog(entries);

  try {
    const channel = await client.channels.fetch(CHANNELS.EVENT_LOG);
    if (channel?.isTextBased()) {
      const actor = actorId ? `<@${actorId}>` : "system";
      const target = auditEntry.target_id ? ` (${auditEntry.target_id})` : "";
      await channel.send(
        `[AUDIT] ${auditEntry.action} by ${actor}: ${auditEntry.summary}${target}`
      );
    }
  } catch (error) {
    console.error("AUDIT_LOG Fehler:", error);
  }

  return auditEntry;
}

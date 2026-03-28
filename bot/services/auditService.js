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

function formatAuditMessage(auditEntry) {
  const actor = auditEntry.actor_id ? `<@${auditEntry.actor_id}>` : "System";
  const title = auditEntry.summary || "ohne Details";
  const target = auditEntry.target_id ? `\nTemplate: \`${auditEntry.target_id}\`` : "";

  const labels = {
    "template.created": "hat ein neues Event angelegt",
    "template.updated": "hat Basisdaten eines Events bearbeitet",
    "template.selection_updated": "hat Dropdown-Angaben eines Events bearbeitet",
    "template.extras_updated": "hat Zusatzangaben eines Events bearbeitet",
    "template.editors_view_opened": "hat die Mitbearbeiter-Ansicht geoeffnet",
    "template.editors_updated": "hat Mitbearbeiter aktualisiert",
    "template.editors_cleared": "hat alle Mitbearbeiter entfernt",
    "template.address_view_opened": "hat die Adressansicht geoeffnet",
    "template.details_view_opened": "hat die Detailansicht geoeffnet",
    "template.recurrence_updated": "hat die Wiederholung eines Events geaendert",
    "template.plot_page_opened": "hat die Plot-Auswahl gewechselt",
    "template.ward_page_opened": "hat die Bezirks-Auswahl gewechselt",
    "template.opened": "hat ein bestehendes Event geoeffnet",
    "template.submitted": "hat ein Event zur Pruefung eingereicht",
    "template.approved": "hat ein Event freigegeben",
    "template.rejected": "hat ein Event abgelehnt",
    "template.cancelled": "hat ein Event als abgesagt markiert",
    "template.unpublished": "hat die Veroeffentlichung eines Events zurueckgenommen",
    "calendar_feed.forced": "hat den Kalenderfeed manuell neu erzeugt",
    "admin.cleanup": "hat einen Bot-Cleanup gestartet"
  };

  const label = labels[auditEntry.action] || `hat die Aktion \`${auditEntry.action}\` ausgefuehrt`;
  return `${actor} ${label}\nDetails: ${title}${target}`;
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
      await channel.send(formatAuditMessage(auditEntry));
    }
  } catch (error) {
    console.error("AUDIT_LOG Fehler:", error);
  }

  return auditEntry;
}

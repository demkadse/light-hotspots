import {
  SlashCommandBuilder
} from "discord.js";

import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { replyAndExpire } from "../services/interactionResponseService.js";
import { resyncEventIndex } from "../services/templateService.js";
import { recordAuditEntry } from "../services/auditService.js";

export const data = new SlashCommandBuilder()
  .setName("resync-events")
  .setDMPermission(false)
  .setDescription("Prüft oder repariert events/data/index.json")
  .addBooleanOption(option =>
    option
      .setName("fix")
      .setDescription("Index automatisch reparieren")
      .setRequired(false)
  );

export async function execute(interaction) {
  assertAdminUser(interaction);
  assertActionCooldown(interaction.user.id, "resync-events", 30000);

  const applyFixes = interaction.options.getBoolean("fix") || false;
  const result = await resyncEventIndex({ applyFixes });

  const parts = [
    `Index: ${result.totalIndexed}`,
    `Dateien: ${result.totalActual}`,
    `Fehlend im Index: ${result.missingFromIndex.length}`,
    `Leichen im Index: ${result.staleInIndex.length}`,
    `Datumsabweichungen: ${result.dateMismatches.length}`
  ];

  if (applyFixes) {
    parts.push("Fix angewendet.");
  }

  await recordAuditEntry(interaction.client, {
    action: applyFixes ? "events.resync_fixed" : "events.resync_checked",
    actor_id: interaction.user.id,
    summary: parts.join(" | ")
  });

  await replyAndExpire(interaction, {
    content: parts.join("\n"),
    ephemeral: true
  }, 120000);
}

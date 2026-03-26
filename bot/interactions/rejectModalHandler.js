import { rejectTemplate, getTemplate } from "../services/templateService.js";
import {
  deferEphemeral,
  replyAndExpire
} from "../services/interactionResponseService.js";
import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { recordAuditEntry } from "../services/auditService.js";
import { getTemplateOwnerId } from "../services/identityService.js";

function formatRejectReason(reason) {
  const lines = reason
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "- Kein Grund angegeben.";
  }

  if (lines.length === 1) {
    return `- ${lines[0]}`;
  }

  return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

export async function handleRejectModal(interaction, client) {
  try {
    assertAdminUser(interaction);
    assertActionCooldown(interaction.user.id, `reject-modal:${interaction.customId}`, 30000);
    await deferEphemeral(interaction);

    const templateId = interaction.customId.split("_").pop();
    const reason = interaction.fields.getTextInputValue("reason");
    const template = await getTemplate(templateId);
    const ownerId = await getTemplateOwnerId(template);

    await rejectTemplate(templateId, reason);
    await replyAndExpire(interaction, {
      content: "Event wurde abgelehnt.",
      ephemeral: true
    });

    await recordAuditEntry(client, {
      action: "template.rejected",
      actor_id: interaction.user.id,
      target_id: templateId,
      summary: `${template?.title || "Unbenannt"} | ${reason}`
    });

    try {
      const user = ownerId ? await client.users.fetch(ownerId) : null;
      if (!user) {
        return;
      }

      await user.send(
`Dein Event wurde leider abgelehnt.\n\n**${template.title}**\nOrt: ${template.venue || "-"}\nDatum: ${template.date || "-"}\nZeit: ${template.time || "-"}\n\nGruende:\n${formatRejectReason(reason)}\n\nBitte korrigiere die genannten Punkte und reiche das Event danach gern erneut ein.`
      );
    } catch (error) {
      console.warn("DM fehlgeschlagen:", error.message);
    }
  } catch (error) {
    console.error("Reject Error:", error);
    throw error;
  }
}

import { rejectTemplate, getTemplate } from "../services/templateService.js";
import {
  deferEphemeral,
  replyAndExpire
} from "../services/interactionResponseService.js";
import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { recordAuditEntry } from "../services/auditService.js";
import { getTemplateOwnerId } from "../services/identityService.js";
import { CHANNELS } from "../config/channels.js";

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

async function deleteApprovalMessage(client, messageId) {
  if (!messageId || messageId === "unknown") {
    return false;
  }

  try {
    const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);
    if (!channel?.isTextBased()) {
      return false;
    }

    const message = await channel.messages.fetch(messageId);
    if (!message?.deletable) {
      return false;
    }

    await message.delete();
    return true;
  } catch (error) {
    console.warn("Approval-Nachricht konnte nach Ablehnung nicht geloescht werden:", error.message);
    return false;
  }
}

async function sendRejectErrorLog(client, { actorId, templateId, templateTitle, error }) {
  try {
    const errorChannel = await client.channels.fetch(CHANNELS.ERROR_LOG);
    if (!errorChannel?.isTextBased()) {
      return;
    }

    await errorChannel.send([
      "Fehler bei Aktion: Event ablehnen",
      `Ausgeloest von: ${actorId ? `<@${actorId}>` : "unbekannt"}`,
      templateTitle ? `Event: ${templateTitle}` : null,
      templateId ? `Template: \`${templateId}\`` : null,
      "Fehlermeldung:",
      "```",
      error?.message || String(error),
      "```"
    ].filter(Boolean).join("\n"));
  } catch (logError) {
    console.error("ERROR_LOG Fehler:", logError);
  }
}

export async function handleRejectModal(interaction, client) {
  try {
    assertAdminUser(interaction);
    assertActionCooldown(interaction.user.id, `reject-modal:${interaction.customId}`, 30000);
    await deferEphemeral(interaction);

    const customIdParts = interaction.customId.split("_");
    const approvalMessageId = customIdParts.pop();
    const templateId = customIdParts.pop();
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
    await deleteApprovalMessage(client, approvalMessageId);

    try {
      const user = ownerId ? await client.users.fetch(ownerId) : null;
      if (!user) {
        return;
      }

      await user.send(
`Dein Event wurde leider abgelehnt.\n\n**${template.title}**\nOrt: ${template.venue || "-"}\nDatum: ${template.date || "-"}\nZeit: ${template.time || "-"}\n\nGründe:\n${formatRejectReason(reason)}\n\nBitte korrigiere die genannten Punkte und reiche das Event danach gern erneut ein.`
      );
    } catch (error) {
      console.warn("DM fehlgeschlagen:", error.message);
    }
  } catch (error) {
    console.error("Reject Error:", error);
    const customIdParts = interaction.customId?.split("_") || [];
    const templateId = customIdParts.length >= 3 ? customIdParts[customIdParts.length - 2] : null;
    await sendRejectErrorLog(client, {
      actorId: interaction.user?.id,
      templateId,
      error
    });
    throw error;
  }
}

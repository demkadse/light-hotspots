import { rejectTemplate, getTemplate } from "../services/templateService.js";
import { replyAndExpire } from "../services/interactionResponseService.js";
import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { recordAuditEntry } from "../services/auditService.js";

export async function handleRejectModal(interaction, client) {
  try {
    assertAdminUser(interaction);
    assertActionCooldown(interaction.user.id, `reject-modal:${interaction.customId}`, 30000);

    const templateId = interaction.customId.split("_").pop();
    const reason = interaction.fields.getTextInputValue("reason");
    const template = await getTemplate(templateId);

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
      const user = await client.users.fetch(template.created_by);
      await user.send(
`Dein Event wurde abgelehnt.

Event:
${template.title}

Grund der Ablehnung:
${reason}

Bitte korrigiere die genannten Punkte und reiche das Event erneut ein.`
      );
    } catch (error) {
      console.warn("DM fehlgeschlagen:", error.message);
    }
  } catch (error) {
    console.error("Reject Error:", error);
    throw error;
  }
}

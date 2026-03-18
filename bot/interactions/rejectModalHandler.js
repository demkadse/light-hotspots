import { rejectTemplate, getTemplate } from "../services/templateService.js";

export async function handleRejectModal(interaction, client) {
  if (!interaction.customId.startsWith("reject_modal_")) return;

  try {
    const templateId = interaction.customId.split("_").pop();
    const reason = interaction.fields.getTextInputValue("reason");

    const template = await getTemplate(templateId);

    await rejectTemplate(templateId, reason);

    await interaction.reply({
      content: "❌ Event wurde abgelehnt.",
      ephemeral: true
    });

    // Optional: User informieren
    try {
      const user = await client.users.fetch(template.created_by);

      await user.send(
        `❌ Dein Event wurde abgelehnt.\n\nGrund:\n${reason}`
      );
    } catch (err) {
      console.warn("Konnte User nicht benachrichtigen:", err.message);
    }

  } catch (err) {
    console.error("Reject Modal Error:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Fehler beim Ablehnen.",
        ephemeral: true
      });
    }
  }
}
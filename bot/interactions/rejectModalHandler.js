import { rejectTemplate, getTemplate } from "../services/templateService.js";

export async function handleRejectModal(interaction, client) {
  try {
    const templateId = interaction.customId.split("_").pop();
    const reason = interaction.fields.getTextInputValue("reason");

    const template = await getTemplate(templateId);

    await rejectTemplate(templateId, reason);

    await interaction.reply({
      content: "❌ Event abgelehnt.",
      ephemeral: true
    });

    try {
      const user = await client.users.fetch(template.created_by);
      await user.send(`❌ Dein Event wurde abgelehnt:\n${reason}`);
    } catch {}

  } catch (err) {
    console.error("Reject Error:", err);
  }
}
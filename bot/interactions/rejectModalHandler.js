import { updateTemplateStatus, getTemplateById } from "../services/templateService.js";

export async function handleRejectModal(interaction, client) {

  if (!interaction.customId.startsWith("reject_modal_")) return;

  const id = interaction.customId.replace("reject_modal_", "");
  const reason = interaction.fields.getTextInputValue("reason");

  const template = await updateTemplateStatus(id, {
    status: "rejected",
    rejection_reason: reason
  });

  try {
    const user = await client.users.fetch(template.created_by);
    await user.send(`❌ Dein Event wurde abgelehnt.\n\nGrund:\n${reason}`);
  } catch {}

  await interaction.reply({
    content: "❌ Template abgelehnt.",
    flags: 64
  });

}
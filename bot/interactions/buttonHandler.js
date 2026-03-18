import { updateTemplateStatus, getTemplateById } from "../services/templateService.js";
import { createEventFromTemplate } from "../services/eventService.js";
import { CHANNELS } from "../config/channels.js";

export async function handleButton(interaction, client) {

  if (interaction.customId.startsWith("approve_")) {

    const id = interaction.customId.replace("approve_", "");

    const template = await updateTemplateStatus(id, {
      status: "approved",
      rejection_reason: null
    });

    const event = await createEventFromTemplate(template);

    // DM User
    try {
      const user = await client.users.fetch(template.created_by);
      await user.send(`🎉 Dein Event "${event.title}" wurde freigegeben!`);
    } catch {}

    return interaction.reply({
      content: "✅ Event erstellt und freigegeben.",
      flags: 64
    });
  }

  if (interaction.customId.startsWith("reject_")) {

    const id = interaction.customId.replace("reject_", "");

    await interaction.showModal({
      custom_id: `reject_modal_${id}`,
      title: "Ablehnungsgrund",
      components: [{
        type: 1,
        components: [{
          type: 4,
          custom_id: "reason",
          label: "Grund",
          style: 2,
          required: true
        }]
      }]
    });
  }

}
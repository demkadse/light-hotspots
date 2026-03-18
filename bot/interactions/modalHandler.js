import { createOrUpdateTemplate } from "../services/templateService.js";
import { CHANNELS } from "../config/channels.js";

export async function handleModal(interaction, client) {

  if (!interaction.customId.startsWith("event_modal_")) return;

  try {

    const title = interaction.fields.getTextInputValue("title");
    const venue = interaction.fields.getTextInputValue("venue");
    const date = interaction.fields.getTextInputValue("date");
    const time = interaction.fields.getTextInputValue("time");
    const description = interaction.fields.getTextInputValue("description");
    const image = interaction.fields.getTextInputValue("image") || null;

    const template = await createOrUpdateTemplate({
      title,
      venue,
      date,
      time,
      description,
      image
    }, interaction.user.id);

    // DM an User (Submit)
    try {
      await interaction.user.send(
        "📨 Dein Event wurde eingereicht!\n\nBitte warte, bis ein Administrator es geprüft hat."
      );
    } catch {}

    // Approval Channel
    const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

    await channel.send({
      content: `📦 Neues Template von <@${interaction.user.id}>`,
      components: [{
        type: 1,
        components: [
          {
            type: 2,
            label: "Annehmen",
            style: 3,
            custom_id: `approve_${template.id}`
          },
          {
            type: 2,
            label: "Ablehnen",
            style: 4,
            custom_id: `reject_${template.id}`
          }
        ]
      }]
    });

    await interaction.reply({
      content: "✅ Eingereicht und wartet auf Prüfung.",
      flags: 64
    });

  } catch (err) {

    await interaction.reply({
      content: "❌ Fehler beim Einreichen.",
      flags: 64
    });

  }

}
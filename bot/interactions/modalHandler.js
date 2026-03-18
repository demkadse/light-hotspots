import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { createOrUpdateTemplate } from "../services/templateService.js";

export async function handleModal(interaction, client) {

  // 🟢 EVENT MODAL (STEP 1)
  if (interaction.customId.startsWith("event_modal_")) {

    const title = interaction.fields.getTextInputValue("title");
    const venue = interaction.fields.getTextInputValue("venue");
    const date = interaction.fields.getTextInputValue("date");
    const time = interaction.fields.getTextInputValue("time");
    const description = interaction.fields.getTextInputValue("description");

    const template = await createOrUpdateTemplate({
      title,
      venue,
      date,
      time,
      description,
      image: null,
      status: "draft"
    }, interaction.user.id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:setImage:${template.id}`)
        .setLabel("🖼 Bild hinzufügen")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`event:submit:${template.id}`)
        .setLabel("📨 Zur Prüfung senden")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      content: "✅ Event gespeichert (Entwurf).\nDu kannst jetzt optional ein Bild hinzufügen oder es direkt einreichen.",
      components: [row],
      ephemeral: true
    });

    return;
  }

  // 🟢 IMAGE MODAL (STEP 2)
  if (interaction.customId.startsWith("event_image_modal_")) {

    const templateId = interaction.customId.split("_").pop();
    const image = interaction.fields.getTextInputValue("image");

    const isValid = /\.(jpg|jpeg|png|gif)$/i.test(image);

    if (!isValid) {
      return await interaction.reply({
        content: "❌ Ungültige Bild-URL (.jpg, .png, .gif)",
        ephemeral: true
      });
    }

    // 👉 speichern
    await createOrUpdateTemplate({
      image
    }, interaction.user.id, templateId);

    await interaction.reply({
      content: "🖼 Bild gespeichert!",
      ephemeral: true
    });

    return;
  }
}
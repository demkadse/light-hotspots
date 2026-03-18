import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { createOrUpdateTemplate } from "../services/templateService.js";

export async function handleModal(interaction, client) {

  // EVENT CREATE
  if (interaction.customId === "event_modal_create") {

    const data = {
      title: interaction.fields.getTextInputValue("title"),
      venue: interaction.fields.getTextInputValue("venue"),
      date: interaction.fields.getTextInputValue("date"),
      time: interaction.fields.getTextInputValue("time"),
      description: interaction.fields.getTextInputValue("description"),
      image: null,
      status: "draft"
    };

    const template = await createOrUpdateTemplate(data, interaction.user.id);

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
      content: "✅ Entwurf gespeichert.",
      components: [row],
      ephemeral: true
    });

    return;
  }

  // IMAGE MODAL
  if (interaction.customId.startsWith("event_image_modal_")) {

    const templateId = interaction.customId.split("_").pop();
    const image = interaction.fields.getTextInputValue("image");

    if (!/\.(jpg|jpeg|png|gif)$/i.test(image)) {
      return await interaction.reply({
        content: "❌ Ungültige Bild-URL.",
        ephemeral: true
      });
    }

    await createOrUpdateTemplate({ image }, interaction.user.id, templateId);

    await interaction.reply({
      content: "🖼 Bild gespeichert.",
      ephemeral: true
    });

    return;
  }
}
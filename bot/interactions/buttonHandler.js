import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { submitTemplateForApproval } from "../services/templateService.js";
import { CHANNELS } from "../config/channels.js";

export async function handleButton(interaction, client) {
  const id = interaction.customId;

  try {

    // CREATE EVENT
    if (id === "event:create") {

      const modal = new ModalBuilder()
        .setCustomId("event_modal_create")
        .setTitle("Event erstellen");

      const fields = [
        ["title", "Titel"],
        ["venue", "Location / Venue"],
        ["date", "Datum"],
        ["time", "Uhrzeit"],
        ["description", "Beschreibung", TextInputStyle.Paragraph]
      ];

      modal.addComponents(
        ...fields.map(([id, label, style = TextInputStyle.Short]) =>
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(id)
              .setLabel(label)
              .setStyle(style)
              .setRequired(true)
          )
        )
      );

      await interaction.showModal(modal);
      return;
    }

    // SET IMAGE
    if (id.startsWith("event:setImage:")) {
      const templateId = id.split(":")[2];

      const modal = new ModalBuilder()
        .setCustomId(`event_image_modal_${templateId}`)
        .setTitle("Bild hinzufügen");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("image")
            .setLabel("Bild URL (.jpg, .png, .gif)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
      return;
    }

    // SUBMIT
    if (id.startsWith("event:submit:")) {
      const templateId = id.split(":")[2];

      const template = await submitTemplateForApproval(templateId);
      const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`event:approve:${template.id}`)
          .setLabel("Annehmen")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`event:reject:${template.id}`)
          .setLabel("Ablehnen")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `📦 Neues Event von <@${template.created_by}>`,
        components: [row]
      });

      await interaction.reply({
        content: "📨 Event eingereicht.",
        ephemeral: true
      });

      return;
    }

    // APPROVE
    if (id.startsWith("event:approve:")) {
      await interaction.reply({
        content: "✅ Event angenommen (noch ohne Veröffentlichung).",
        ephemeral: true
      });
      return;
    }

    // REJECT → öffnet Modal
    if (id.startsWith("event:reject:")) {
      const templateId = id.split(":")[2];

      const modal = new ModalBuilder()
        .setCustomId(`reject_modal_${templateId}`)
        .setTitle("Event ablehnen");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Grund")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
      return;
    }

  } catch (err) {
    console.error("Button Error:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Fehler beim Button.",
        ephemeral: true
      });
    }
  }
}
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

    // 🟢 EVENT CREATE → Modal öffnen
    if (id === "event:create") {

      const modal = new ModalBuilder()
        .setCustomId("event_modal_create")
        .setTitle("Event erstellen");

      const titleInput = new TextInputBuilder()
        .setCustomId("title")
        .setLabel("Titel")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const venueInput = new TextInputBuilder()
        .setCustomId("venue")
        .setLabel("Location / Venue")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const dateInput = new TextInputBuilder()
        .setCustomId("date")
        .setLabel("Datum (z.B. 20.03.2026)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const timeInput = new TextInputBuilder()
        .setCustomId("time")
        .setLabel("Uhrzeit")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const descriptionInput = new TextInputBuilder()
        .setCustomId("description")
        .setLabel("Beschreibung")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(venueInput),
        new ActionRowBuilder().addComponents(dateInput),
        new ActionRowBuilder().addComponents(timeInput),
        new ActionRowBuilder().addComponents(descriptionInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // 🟢 IMAGE MODAL öffnen
    if (id.startsWith("event:setImage:")) {
      const templateId = id.split(":")[2];

      const modal = new ModalBuilder()
        .setCustomId(`event_image_modal_${templateId}`)
        .setTitle("Bild hinzufügen");

      const imageInput = new TextInputBuilder()
        .setCustomId("image")
        .setLabel("Bild URL (.jpg, .png, .gif)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(imageInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // 🟢 SUBMIT → Approval Channel
    if (id.startsWith("event:submit:")) {
      const templateId = id.split(":")[2];

      const template = await submitTemplateForApproval(templateId);

      const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

      if (!channel) {
        throw new Error("Approval Channel nicht gefunden");
      }

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
        content: "📨 Event wurde zur Prüfung gesendet!",
        ephemeral: true
      });

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
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";

import {
  submitTemplateForApproval,
  getTemplate,
  approveTemplate
} from "../services/templateService.js";

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
        ["title", "Titel", "z.B. Club Night"],
        ["venue", "Location", "z.B. Limsa Lominsa"],
        ["date", "Datum", "z.B. 20.03.2026"],
        ["time", "Uhrzeit", "z.B. 20:00"],
        ["description", "Beschreibung", "Kurze Beschreibung", TextInputStyle.Paragraph]
      ];

      modal.addComponents(
        ...fields.map(([id, label, placeholder, style = TextInputStyle.Short]) =>
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(id)
              .setLabel(label)
              .setPlaceholder(placeholder)
              .setStyle(style)
              .setRequired(true)
          )
        )
      );

      await interaction.showModal(modal);
      return;
    }

    // IMAGE
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
            .setPlaceholder("https://...")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
      return;
    }

    // SUBMIT → mit Preview
    if (id.startsWith("event:submit:")) {
      const templateId = id.split(":")[2];

      const template = await submitTemplateForApproval(templateId);
      const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

      const embed = new EmbedBuilder()
        .setTitle(template.title)
        .setDescription(template.description)
        .addFields(
          { name: "📍 Ort", value: template.venue, inline: true },
          { name: "📅 Datum", value: template.date, inline: true },
          { name: "⏰ Zeit", value: template.time, inline: true }
        )
        .setFooter({
          text: `Erstellt von ${template.created_by}`
        });

      if (template.image) {
        embed.setImage(template.image);
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
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: "📨 Event wurde zur Prüfung gesendet.",
        ephemeral: true
      });

      return;
    }

    // APPROVE
    if (id.startsWith("event:approve:")) {
      const templateId = id.split(":")[2];

      const template = await approveTemplate(templateId);

      await interaction.reply({
        content: "✅ Event angenommen.",
        ephemeral: true
      });

      try {
        const user = await client.users.fetch(template.created_by);

        await user.send(
`✅ **Dein Event wurde angenommen!**

🎉 Dein Event wurde erfolgreich geprüft und freigegeben.

**Details:**
📌 ${template.title}  
📍 ${template.venue}  
📅 ${template.date} um ${template.time}

Viel Erfolg bei deinem Event – wir wünschen dir viele Besucher! 🚀`
        );

      } catch (err) {
        console.warn("DM fehlgeschlagen:", err.message);
      }

      return;
    }

    // REJECT → Modal
    if (id.startsWith("event:reject:")) {
      const templateId = id.split(":")[2];

      const modal = new ModalBuilder()
        .setCustomId(`reject_modal_${templateId}`)
        .setTitle("Event ablehnen");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Grund der Ablehnung")
            .setPlaceholder("Was muss verbessert werden?")
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
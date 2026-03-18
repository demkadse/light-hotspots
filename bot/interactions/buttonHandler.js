import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} from "discord.js";

import {
  getTemplatesByUser,
  submitTemplateForApproval,
  approveTemplate,
  getTemplate
} from "../services/templateService.js";

import { CHANNELS } from "../config/channels.js";

export async function handleButton(interaction, client) {
  const id = interaction.customId;

  try {

    // 🟢 TEMPLATE AUSWAHL
    if (id === "event:create") {

      const templates = await getTemplatesByUser(interaction.user.id);

      const options = [
        {
          label: "➕ Neues Event erstellen",
          value: "new",
          description: "Starte ein neues Event"
        }
      ];

      templates.slice(0, 24).forEach(t => {
        options.push({
          label: t.title || "Unbenannt",
          value: t.id,
          description: `${t.date || "kein Datum"} | ${t.status}`
        });
      });

      const select = new StringSelectMenuBuilder()
        .setCustomId("event:selectTemplate")
        .setPlaceholder("Template auswählen")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      await interaction.reply({
        content: "📂 Wähle ein Template:",
        components: [row],
        ephemeral: true
      });

      return;
    }

    // 🟢 IMAGE SETZEN
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
            .setPlaceholder("https://example.com/image.jpg")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
      return;
    }

    // 🟢 SUBMIT → APPROVAL
    if (id.startsWith("event:submit:")) {
      const templateId = id.split(":")[2];

      const template = await submitTemplateForApproval(templateId);
      const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

      if (!channel) throw new Error("Approval Channel nicht gefunden");

      const embed = new EmbedBuilder()
        .setTitle(template.title)
        .setDescription(template.description)
        .addFields(
          { name: "📍 Ort", value: template.venue || "-", inline: true },
          { name: "📅 Datum", value: template.date || "-", inline: true },
          { name: "⏰ Zeit", value: template.time || "-", inline: true }
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

    // 🟢 APPROVE
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

📌 ${template.title}  
📍 ${template.venue}  
📅 ${template.date} um ${template.time}

Viel Erfolg bei deinem Event! 🚀`
        );

      } catch (err) {
        console.warn("DM fehlgeschlagen:", err.message);
      }

      return;
    }

    // 🟢 REJECT → Modal öffnen
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
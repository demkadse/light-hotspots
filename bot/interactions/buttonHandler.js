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
import { replyAndExpire } from "../services/interactionResponseService.js";
import path from "path";
import { fileURLToPath } from "url";

import { CHANNELS } from "../config/channels.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

export async function handleButton(interaction, client) {
  const id = interaction.customId;

  try {

    // TEMPLATE AUSWAHL
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

      await replyAndExpire(interaction, {
        content: "📂 Wähle ein Template:",
        components: [row],
        ephemeral: true
      }, 120000);

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
            .setPlaceholder("https://example.com/image.jpg")
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

      if (!channel) throw new Error("Approval Channel nicht gefunden");

      const embed = new EmbedBuilder()
        .setTitle(template.title)
        .setDescription(template.description)
        .addFields(
          { name: "📍 Ort", value: template.venue || "-", inline: true },
          { name: "📅 Datum", value: template.date || "-", inline: true },
          { name: "⏰ Zeit", value: template.time || "-", inline: true }
        );

      if (template.image) embed.setImage(template.image);

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

      await replyAndExpire(interaction, {
        content: "📨 Event wurde zur Prüfung gesendet.",
        ephemeral: true
      });

      return;
    }

    // APPROVE + LOGGING
    if (id.startsWith("event:approve:")) {
      const templateId = id.split(":")[2];

      try {

        const template = await approveTemplate(templateId);

        // 👉 bestehende Antwort bleibt UNVERÄNDERT
        await replyAndExpire(interaction, {
          content: "✅ Event angenommen.",
          ephemeral: true
        });

        // =========================
        // EVENT_LOG
        // =========================
        try {
          const ch = await client.channels.fetch(CHANNELS.EVENT_LOG);
          if (ch && ch.isTextBased()) {
            await ch.send(
              `Event "${template.title}" wurde freigegeben von <@${interaction.user.id}>`
            );
          }
        } catch (err) {
          console.error("EVENT_LOG Fehler:", err);
        }

        // =========================
        // COMMIT_LOG
        // =========================
        try {
          const fs = await import("fs/promises");
          const filePath = path.join(REPO_ROOT, "events", "data", template.file);

          const content = await fs.readFile(filePath, "utf-8");

          const ch = await client.channels.fetch(CHANNELS.COMMIT_LOG);
          if (ch && ch.isTextBased()) {
            await ch.send(
              `Commit für "${template.title}":\n\`\`\`json\n${content}\n\`\`\``
            );
          }

        } catch (err) {
          console.error("COMMIT_LOG Fehler:", err);
        }

      } catch (err) {

        console.error("APPROVE ERROR:", err);

        // =========================
        // ERROR_LOG
        // =========================
        try {
          const ch = await client.channels.fetch(CHANNELS.ERROR_LOG);
          if (ch && ch.isTextBased()) {
            await ch.send(
              `Fehler beim Approven:\n\`\`\`\n${err.message}\n\`\`\``
            );
          }
        } catch (logErr) {
          console.error("ERROR_LOG Fehler:", logErr);
        }

        if (!interaction.replied && !interaction.deferred) {
          await replyAndExpire(interaction, {
            content: "❌ Fehler beim Approve.",
            ephemeral: true
          });
        }
      }

      return;
    }

    // REJECT
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
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
      return;
    }

  } catch (err) {
    console.error("Button Error:", err);
    throw err;
  }
}

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
import path from "path";
import { fileURLToPath } from "url";

import {
  getTemplatesByUser,
  submitTemplateForApproval,
  approveTemplate,
  getTemplate,
  unpublishTemplate,
  findPotentialDuplicates
} from "../services/templateService.js";
import { replyAndExpire } from "../services/interactionResponseService.js";
import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { cleanupBotMessages } from "../services/cleanupService.js";
import { recordAuditEntry } from "../services/auditService.js";
import { CHANNELS } from "../config/channels.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

export async function handleButton(interaction, client) {
  const id = interaction.customId;

  try {
    if (id === "admin:cleanup:start") {
      assertAdminUser(interaction);
      assertActionCooldown(interaction.user.id, "cleanup-start", 10000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("admin:cleanup:confirm")
          .setLabel("Wirklich loeschen")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("admin:cleanup:cancel")
          .setLabel("Abbrechen")
          .setStyle(ButtonStyle.Secondary)
      );

      await replyAndExpire(interaction, {
        content: "Dadurch werden Bot-Nachrichten in den Log- und Approval-Channels geloescht.",
        components: [row],
        ephemeral: true
      }, 120000);

      return;
    }

    if (id === "admin:cleanup:cancel") {
      assertAdminUser(interaction);

      await replyAndExpire(interaction, {
        content: "Cleanup abgebrochen.",
        ephemeral: true
      });

      return;
    }

    if (id === "admin:cleanup:confirm") {
      assertAdminUser(interaction);
      assertActionCooldown(interaction.user.id, "cleanup-confirm", 60000);

      const summary = await cleanupBotMessages(client);
      const summaryText = summary
        .map(entry => `<#${entry.channelId}>: ${entry.deleted} geloescht`)
        .join("\n");

      await replyAndExpire(interaction, {
        content: `Cleanup abgeschlossen.\n${summaryText}`,
        ephemeral: true
      }, 120000);

      await recordAuditEntry(client, {
        action: "admin.cleanup",
        actor_id: interaction.user.id,
        summary: summaryText
      });

      return;
    }

    if (id === "event:create") {
      const templates = await getTemplatesByUser(interaction.user.id);

      const options = [
        {
          label: "Neues Event erstellen",
          value: "new",
          description: "Starte ein neues Event"
        }
      ];

      templates.slice(0, 24).forEach(template => {
        options.push({
          label: template.title || "Unbenannt",
          value: template.id,
          description: `${template.date || "kein Datum"} | ${template.status}`
        });
      });

      const select = new StringSelectMenuBuilder()
        .setCustomId("event:selectTemplate")
        .setPlaceholder("Template auswaehlen")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      await replyAndExpire(interaction, {
        content: "Waehle ein Template:",
        components: [row],
        ephemeral: true
      }, 120000);

      return;
    }

    if (id.startsWith("event:setImage:")) {
      const templateId = id.split(":")[2];

      const modal = new ModalBuilder()
        .setCustomId(`event_image_modal_${templateId}`)
        .setTitle("Bild hinzufuegen");

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

    if (id.startsWith("event:submit:")) {
      const templateId = id.split(":")[2];
      const draft = await getTemplate(templateId);
      const template = await submitTemplateForApproval(templateId);
      const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

      if (!channel) {
        throw new Error("Approval Channel nicht gefunden");
      }

      const duplicates = await findPotentialDuplicates(draft);
      const embed = new EmbedBuilder()
        .setTitle(template.title)
        .setDescription(template.description)
        .addFields(
          { name: "Ort", value: template.venue || "-", inline: true },
          { name: "Datum", value: template.date || "-", inline: true },
          { name: "Zeit", value: template.time || "-", inline: true }
        );

      if (template.image) {
        embed.setImage(template.image);
      }

      if (duplicates.length > 0) {
        embed.addFields({
          name: "Moegliche Duplikate",
          value: duplicates
            .map(entry => `${entry.title} | ${entry.venue} | ${entry.date}`)
            .join("\n")
            .slice(0, 1024)
        });
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
        content: `Neues Event von <@${template.created_by}>`,
        embeds: [embed],
        components: [row]
      });

      await recordAuditEntry(client, {
        action: "template.submitted",
        actor_id: interaction.user.id,
        target_id: template.id,
        summary: template.title || "Unbenannt"
      });

      await replyAndExpire(interaction, {
        content: "Event wurde zur Pruefung gesendet.",
        ephemeral: true
      });

      return;
    }

    if (id.startsWith("event:approve:")) {
      assertAdminUser(interaction);
      assertActionCooldown(interaction.user.id, `approve:${id}`, 10000);
      const templateId = id.split(":")[2];

      try {
        const template = await approveTemplate(templateId);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`event:unpublish:${templateId}`)
            .setLabel("Veroeffentlichung zuruecknehmen")
            .setStyle(ButtonStyle.Danger)
        );

        await replyAndExpire(interaction, {
          content: "Event angenommen.",
          components: [row],
          ephemeral: true
        }, 120000);

        try {
          const logChannel = await client.channels.fetch(CHANNELS.EVENT_LOG);
          if (logChannel?.isTextBased()) {
            await logChannel.send(
              `Event "${template.title}" wurde freigegeben von <@${interaction.user.id}>`
            );
          }
        } catch (error) {
          console.error("EVENT_LOG Fehler:", error);
        }

        await recordAuditEntry(client, {
          action: "template.approved",
          actor_id: interaction.user.id,
          target_id: templateId,
          summary: template.title || "Unbenannt"
        });

        try {
          const fs = await import("fs/promises");
          const filePath = path.join(REPO_ROOT, "events", "data", template.file);
          const content = await fs.readFile(filePath, "utf-8");
          const commitChannel = await client.channels.fetch(CHANNELS.COMMIT_LOG);

          if (commitChannel?.isTextBased()) {
            await commitChannel.send(
              `Commit fuer "${template.title}":\n\`\`\`json\n${content}\n\`\`\``
            );
          }
        } catch (error) {
          console.error("COMMIT_LOG Fehler:", error);
        }
      } catch (error) {
        console.error("APPROVE ERROR:", error);

        try {
          const errorChannel = await client.channels.fetch(CHANNELS.ERROR_LOG);
          if (errorChannel?.isTextBased()) {
            await errorChannel.send(
              `Fehler beim Approven:\n\`\`\`\n${error.message}\n\`\`\``
            );
          }
        } catch (logError) {
          console.error("ERROR_LOG Fehler:", logError);
        }

        if (!interaction.replied && !interaction.deferred) {
          await replyAndExpire(interaction, {
            content: "Fehler beim Approve.",
            ephemeral: true
          });
        }
      }

      return;
    }

    if (id.startsWith("event:reject:")) {
      assertAdminUser(interaction);
      assertActionCooldown(interaction.user.id, `reject:${id}`, 10000);
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

    if (id.startsWith("event:unpublish:")) {
      assertAdminUser(interaction);
      const templateId = id.split(":")[2];

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`event:unpublish_confirm:${templateId}`)
          .setLabel("Ja, wirklich zuruecknehmen")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`event:unpublish_cancel:${templateId}`)
          .setLabel("Abbrechen")
          .setStyle(ButtonStyle.Secondary)
      );

      await replyAndExpire(interaction, {
        content: "Diese Aktion entfernt die Event-Datei und den Index-Eintrag. Wirklich fortfahren?",
        components: [row],
        ephemeral: true
      }, 120000);

      return;
    }

    if (id.startsWith("event:unpublish_cancel:")) {
      assertAdminUser(interaction);
      await replyAndExpire(interaction, {
        content: "Unpublish abgebrochen.",
        ephemeral: true
      });
      return;
    }

    if (id.startsWith("event:unpublish_confirm:")) {
      assertAdminUser(interaction);
      assertActionCooldown(interaction.user.id, `unpublish:${id}`, 30000);
      const templateId = id.split(":")[2];
      const result = await unpublishTemplate(templateId);

      await recordAuditEntry(client, {
        action: "template.unpublished",
        actor_id: interaction.user.id,
        target_id: templateId,
        summary: result.title || "Unbenannt"
      });

      await replyAndExpire(interaction, {
        content: `Veroeffentlichung zurueckgenommen: ${result.title}`,
        ephemeral: true
      });

      return;
    }
  } catch (error) {
    console.error("Button Error:", error);
    throw error;
  }
}

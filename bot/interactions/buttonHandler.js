import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} from "discord.js";
import path from "path";
import { fileURLToPath } from "url";

import {
  getTemplatesByUser,
  submitTemplateForApproval,
  approveTemplate,
  getTemplate,
  unpublishTemplate,
  cancelPublishedTemplate,
  findPotentialDuplicates
} from "../services/templateService.js";
import {
  deferEphemeral,
  replyAndExpire
} from "../services/interactionResponseService.js";
import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { cleanupBotMessages } from "../services/cleanupService.js";
import { recordAuditEntry } from "../services/auditService.js";
import { CHANNELS } from "../config/channels.js";
import { getTemplateOwnerId } from "../services/identityService.js";
import { writeAndSyncWeeklyCalendarFeedFiles } from "../services/calendarFeedService.js";
import {
  buildApprovalWaitingMessage,
  buildBasicsModal,
  buildExtrasModal,
  buildPreviewEmbed,
  buildTemplateSummary,
  buildWizardComponents,
  buildWizardMessage
} from "../services/eventWizardUiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function sendTemplateDm(client, userId, message) {
  if (!userId) {
    return;
  }

  try {
    const user = await client.users.fetch(userId);
    await user.send(message);
  } catch (error) {
    console.warn("DM fehlgeschlagen:", error.message);
  }
}

async function replyWithWizardPreview(interaction, template, client, auditAction, message = null) {
  const duplicates = await findPotentialDuplicates(template);

  if (auditAction) {
    await recordAuditEntry(client, {
      action: auditAction,
      actor_id: interaction.user.id,
      target_id: template.id,
      summary: template.title || "Unbenannt"
    });
  }

  await replyAndExpire(interaction, {
    content: message || buildWizardMessage(template),
    embeds: [buildPreviewEmbed(template, duplicates)],
    components: buildWizardComponents(template),
    ephemeral: true
  }, 120000);
}

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
      await deferEphemeral(interaction);

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

    if (id === "event:start") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("event:new:event")
          .setLabel("Event erstellen")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("event:new:venue")
          .setLabel("Venue erstellen")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("event:edit")
          .setLabel("Bestehendes Event bearbeiten")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("event:cancel")
          .setLabel("Veroeffentlichtes Event absagen")
          .setStyle(ButtonStyle.Secondary)
      );

      await replyAndExpire(interaction, {
        content: "Waehle direkt, ob du ein Event oder eine Venue anlegen, ein bestehendes Event bearbeiten oder ein veroeffentlichtes Event absagen moechtest.",
        components: [row],
        ephemeral: true
      }, 120000);

      return;
    }

    if (id === "event:new") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("event:new:event")
          .setLabel("Als Event erstellen")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("event:new:venue")
          .setLabel("Als Venue erstellen")
          .setStyle(ButtonStyle.Secondary)
      );

      await replyAndExpire(interaction, {
        content: "Was moechtest du anlegen?",
        components: [row],
        ephemeral: true
      }, 120000);
      return;
    }

    if (id === "event:new:event") {
      await interaction.showModal(buildBasicsModal(null, "event_modal_basics_create_event"));
      return;
    }

    if (id === "event:new:venue") {
      await interaction.showModal(buildBasicsModal(null, "event_modal_basics_create_venue"));
      return;
    }

    if (id === "event:edit") {
      const templates = await getTemplatesByUser(interaction.user.id);

      if (templates.length === 0) {
        await replyAndExpire(interaction, {
          content: "Du hast aktuell noch kein bestehendes Event. Starte stattdessen mit `Neues Event erstellen`.",
          ephemeral: true
        }, 45000);
        return;
      }

      const options = templates.slice(0, 25).map(template => ({
        label: (template.title || "Unbenannt").slice(0, 100),
        value: template.id,
        description: `${template.date || "kein Datum"} | ${template.status}`.slice(0, 100)
      }));

      const select = new StringSelectMenuBuilder()
        .setCustomId("event:selectTemplate")
        .setPlaceholder("Bestehendes Event auswaehlen")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      await replyAndExpire(interaction, {
        content: "Waehle das Event aus, das du weiterbearbeiten moechtest:",
        components: [row],
        ephemeral: true
      }, 120000);

      return;
    }

    if (id === "event:cancel") {
      const templates = (await getTemplatesByUser(interaction.user.id))
        .filter(template => template.status === "approved");

      if (templates.length === 0) {
        await replyAndExpire(interaction, {
          content: "Du hast aktuell kein veroeffentlichtes Event, das abgesagt werden kann.",
          ephemeral: true
        }, 45000);
        return;
      }

      const options = templates.slice(0, 25).map(template => ({
        label: (template.title || "Unbenannt").slice(0, 100),
        value: template.id,
        description: `${template.date || "kein Datum"} | ${template.venue || "kein Ort"}`.slice(0, 100)
      }));

      const select = new StringSelectMenuBuilder()
        .setCustomId("event:selectCancellationTemplate")
        .setPlaceholder("Veroeffentlichtes Event auswaehlen")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      await replyAndExpire(interaction, {
        content: "Waehle das veroeffentlichte Event aus, das als abgesagt markiert werden soll:",
        components: [row],
        ephemeral: true
      }, 120000);

      return;
    }

    if (id.startsWith("event:editBasics:")) {
      const templateId = id.split(":")[2];
      const template = await getTemplate(templateId);
      await interaction.showModal(buildBasicsModal(template, `event_modal_basics_${templateId}`));
      return;
    }

    if (id.startsWith("event:extras:")) {
      const templateId = id.split(":")[2];
      const template = await getTemplate(templateId);
      await interaction.showModal(buildExtrasModal(template, templateId));
      return;
    }

    if (id.startsWith("event:submit:")) {
      const templateId = id.split(":")[2];
      await deferEphemeral(interaction);
      const template = await submitTemplateForApproval(templateId);
      const ownerId = await getTemplateOwnerId(template);
      const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

      if (!channel) {
        throw new Error("Approval Channel nicht gefunden");
      }

      const duplicates = await findPotentialDuplicates(template);
      const embed = buildPreviewEmbed(template, duplicates);

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
        content: ownerId ? `Neues Event von <@${ownerId}>` : "Neues Event eingereicht",
        embeds: [embed],
        components: [row]
      });

      await recordAuditEntry(client, {
        action: "template.submitted",
        actor_id: interaction.user.id,
        target_id: template.id,
        summary: template.title || "Unbenannt"
      });

      await sendTemplateDm(client, ownerId, buildApprovalWaitingMessage(template));

      await replyAndExpire(interaction, {
        content: "Event wurde zur Pruefung gesendet.",
        ephemeral: true
      });

      return;
    }

    if (id.startsWith("event:approve:")) {
      assertAdminUser(interaction);
      assertActionCooldown(interaction.user.id, `approve:${id}`, 10000);
      await deferEphemeral(interaction);
      const templateId = id.split(":")[2];

      try {
        const template = await approveTemplate(templateId);
        const ownerId = await getTemplateOwnerId(await getTemplate(templateId));
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
            await logChannel.send(`Event "${template.title}" wurde freigegeben von <@${interaction.user.id}>`);
          }
        } catch (error) {
          console.error("EVENT_LOG Fehler:", error);
        }

        await sendTemplateDm(
          client,
          ownerId,
          `Dein Event wurde bestaetigt. Viel Erfolg!\n\n${buildTemplateSummary(template)}\n\nEs ist jetzt fuer die Community sichtbar.`
        );

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
            await commitChannel.send(`Commit fuer "${template.title}":\n\`\`\`json\n${content}\n\`\`\``);
          }
        } catch (error) {
          console.error("COMMIT_LOG Fehler:", error);
        }
      } catch (error) {
        console.error("APPROVE ERROR:", error);

        try {
          const errorChannel = await client.channels.fetch(CHANNELS.ERROR_LOG);
          if (errorChannel?.isTextBased()) {
            await errorChannel.send(`Fehler beim Approven:\n\`\`\`\n${error.message}\n\`\`\``);
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
      const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import("discord.js");

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
      await deferEphemeral(interaction);
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

    if (id === "event:cancel_abort") {
      await replyAndExpire(interaction, {
        content: "Absage abgebrochen.",
        ephemeral: true
      });
      return;
    }

    if (id.startsWith("event:cancel_confirm:")) {
      assertActionCooldown(interaction.user.id, `cancel:${id}`, 30000);
      await deferEphemeral(interaction);
      const templateId = id.split(":")[2];
      const template = await getTemplate(templateId);

      if (!template) {
        throw new Error("Template nicht gefunden");
      }

      const ownsTemplate = (await getTemplatesByUser(interaction.user.id)).some(entry => entry.id === templateId);
      if (!ownsTemplate) {
        throw new Error("Du darfst dieses Event nicht absagen.");
      }

      const result = await cancelPublishedTemplate(templateId);
      let feedUpdated = false;

      try {
        const feedResult = await writeAndSyncWeeklyCalendarFeedFiles();
        feedUpdated = Boolean(feedResult);
      } catch (feedError) {
        console.error("CALENDAR FEED FORCE ERROR:", feedError);
      }

      await recordAuditEntry(client, {
        action: "template.cancelled",
        actor_id: interaction.user.id,
        target_id: templateId,
        summary: result.title || "Unbenannt"
      });

      await replyAndExpire(interaction, {
        content: feedUpdated
          ? `Event als abgesagt markiert: ${result.title}. Die Feed-Dateien wurden direkt aktualisiert.`
          : `Event als abgesagt markiert: ${result.title}. Der Feed konnte gerade nicht automatisch aktualisiert werden.`,
        ephemeral: true
      });

      return;
    }
  } catch (error) {
    console.error("Button Error:", error);
    throw error;
  }
}

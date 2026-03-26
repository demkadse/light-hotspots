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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function formatTemplateSummary(template) {
  return [
    `**${template.title || "Unbenannt"}**`,
    template.venue ? `Ort: ${template.venue}` : null,
    template.server ? `Server: ${template.server}` : null,
    template.date ? `Datum: ${template.date}` : null,
    template.time ? `Zeit: ${buildTimeLabel(template)}` : null
  ].filter(Boolean).join("\n");
}

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

function buildStepOneModal(template = null, modalId = "event_modal_step1_create") {
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("1/3 | Basis");

  const createInput = (id, label, placeholder, value = "") =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setPlaceholder(placeholder)
        .setValue(value || "")
        .setStyle(
          id === "description"
            ? TextInputStyle.Paragraph
            : TextInputStyle.Short
        )
        .setRequired(true)
    );

  modal.addComponents(
    createInput("title", "Titel", "z.B. Club Night", template?.title),
    createInput("venue", "Location", "z.B. Limsa", template?.venue),
    createInput("date", "Datum", "z.B. 20.03.2026", template?.date),
    createInput("time", "Uhrzeit", "z.B. 20:00", template?.time),
    createInput("description", "Beschreibung", "Worum geht es?", template?.description)
  );

  return modal;
}

function buildTimeLabel(template) {
  if (template.time && template.end_time) {
    return `${template.time} - ${template.end_time}`;
  }

  return template.time || "-";
}

function buildApprovalEmbed(template, duplicates) {
  const embed = new EmbedBuilder()
    .setTitle(template.title)
    .setDescription(template.description)
    .addFields(
      { name: "Ort", value: template.venue || "-", inline: true },
      { name: "Datum", value: template.date || "-", inline: true },
      { name: "Zeit", value: buildTimeLabel(template), inline: true }
    );

  if (template.event_type) {
    embed.addFields({
      name: "Eventtyp",
      value: template.event_type,
      inline: true
    });
  }

  if (template.host_display_name) {
    embed.addFields({
      name: "Host",
      value: template.host_display_name,
      inline: true
    });
  }

  if (template.server) {
    embed.addFields({
      name: "Server",
      value: template.server,
      inline: true
    });
  }

  if (template.venue_lead) {
    embed.addFields({
      name: "Venue-Leitung",
      value: template.venue_lead,
      inline: true
    });
  }

  if (template.link) {
    embed.addFields({
      name: "Link",
      value: template.link
    });
  }

  if (template.discord_link) {
    embed.addFields({
      name: "Discord",
      value: template.discord_link
    });
  }

  if (template.notes) {
    embed.addFields({
      name: "Hinweise",
      value: template.notes.slice(0, 1024)
    });
  }

  if (template.image) {
    embed.setImage(template.image);
  }

  if (duplicates.length > 0) {
    embed.addFields({
      name: "Mögliche Duplikate",
      value: duplicates
        .map(entry => `${entry.title} | ${entry.venue} | ${entry.date}`)
        .join("\n")
        .slice(0, 1024)
    });
  }

  return embed;
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
          .setLabel("Wirklich löschen")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("admin:cleanup:cancel")
          .setLabel("Abbrechen")
          .setStyle(ButtonStyle.Secondary)
      );

      await replyAndExpire(interaction, {
        content: "Dadurch werden Bot-Nachrichten in den Log- und Approval-Channels gelöscht.",
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
        .map(entry => `<#${entry.channelId}>: ${entry.deleted} gelöscht`)
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
          .setCustomId("event:new")
          .setLabel("Neues Event erstellen")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("event:edit")
          .setLabel("Bestehendes Event bearbeiten")
          .setStyle(ButtonStyle.Secondary)
      );

      await replyAndExpire(interaction, {
        content: "Starte ein neues Event oder öffne ein vorhandenes, um den 3-Schritte-Ablauf fortzusetzen.",
        components: [row],
        ephemeral: true
      }, 120000);

      return;
    }

    if (id === "event:new") {
      const modal = buildStepOneModal();
      await interaction.showModal(modal);
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
        label: template.title || "Unbenannt",
        value: template.id,
        description: `${template.date || "kein Datum"} | ${template.status}`
      }));

      const select = new StringSelectMenuBuilder()
        .setCustomId("event:selectTemplate")
        .setPlaceholder("Bestehendes Event auswählen")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      await replyAndExpire(interaction, {
        content: "Wähle das Event aus, dessen 3-Schritte-Ablauf du fortsetzen möchtest:",
        components: [row],
        ephemeral: true
      }, 120000);

      return;
    }

    if (id.startsWith("event:details:")) {
      const templateId = id.split(":")[2];
      const template = await getTemplate(templateId);

      const modal = new ModalBuilder()
        .setCustomId(`event_modal_step2_${templateId}`)
        .setTitle("2/3 | Details");

      const createOptionalInput = (customId, label, placeholder, value = "") =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setPlaceholder(placeholder)
            .setValue(value || "")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        );

      modal.addComponents(
        createOptionalInput("end_time", "Endzeit (optional)", "z.B. 23:30", template?.end_time),
        createOptionalInput("event_type", "Eventtyp (optional)", "z.B. Club, Taverne, Markt", template?.event_type),
        createOptionalInput("host_display_name", "Host-Anzeigename (optional)", "z.B. Team Rubinlotus", template?.host_display_name),
        createOptionalInput("venue_lead", "Venue-Leitung (optional)", "z.B. Käptn Mira", template?.venue_lead),
        createOptionalInput("server", "Server", "z.B. Shiva, Odin, Twintania", template?.server)
      );

      await interaction.showModal(modal);
      return;
    }

    if (id.startsWith("event:extras:")) {
      const templateId = id.split(":")[2];
      const template = await getTemplate(templateId);

      const modal = new ModalBuilder()
        .setCustomId(`event_modal_step3_${templateId}`)
        .setTitle("3/3 | Extras");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("image")
            .setLabel("Bild-URL (optional)")
            .setPlaceholder("https://example.com/event.jpg")
            .setValue(template?.image || "")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("discord_link")
            .setLabel("Discord-Link (optional)")
            .setPlaceholder("https://discord.gg/...")
            .setValue(template?.discord_link || "")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("link")
            .setLabel("Externer Link (optional)")
            .setPlaceholder("https://...")
            .setValue(template?.link || "")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("notes")
            .setLabel("Hinweise (optional)")
            .setPlaceholder("z.B. Walk-ins willkommen, 18+, OOC-Tell vorab")
            .setValue(template?.notes || "")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
        )
      );

      await interaction.showModal(modal);
      return;
    }

    if (id.startsWith("event:setImage:")) {
      const templateId = id.split(":")[2];
      const template = await getTemplate(templateId);

      const modal = new ModalBuilder()
        .setCustomId(`event_modal_step2_${templateId}`)
        .setTitle("2/3 | Details");

      const createOptionalInput = (customId, label, placeholder, value = "") =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setPlaceholder(placeholder)
            .setValue(value || "")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        );

      modal.addComponents(
        createOptionalInput("end_time", "Endzeit (optional)", "z.B. 23:30", template?.end_time),
        createOptionalInput("event_type", "Eventtyp (optional)", "z.B. Club, Taverne, Markt", template?.event_type),
        createOptionalInput("host_display_name", "Host-Anzeigename (optional)", "z.B. Team Rubinlotus", template?.host_display_name),
        createOptionalInput("venue_lead", "Venue-Leitung (optional)", "z.B. Käptn Mira", template?.venue_lead),
        createOptionalInput("server", "Server", "z.B. Shiva, Odin, Twintania", template?.server)
      );

      await interaction.showModal(modal);
      return;
    }

    if (id.startsWith("event:submit:")) {
      const templateId = id.split(":")[2];
      await deferEphemeral(interaction);
      const draft = await getTemplate(templateId);
      const template = await submitTemplateForApproval(templateId);
      const ownerId = await getTemplateOwnerId(template);
      const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

      if (!channel) {
        throw new Error("Approval Channel nicht gefunden");
      }

      const duplicates = await findPotentialDuplicates(draft);
      const embed = buildApprovalEmbed(template, duplicates);

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

      await sendTemplateDm(
        client,
        ownerId,
        `Dein Event wird gerade überprüft.\n\n${formatTemplateSummary(template)}\n\nDu wirst benachrichtigt, sobald es ein Update gibt.`
      );

      await replyAndExpire(interaction, {
        content: "Event wurde zur Prüfung gesendet.",
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
            .setLabel("Veröffentlichung zurücknehmen")
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

        await sendTemplateDm(
          client,
          ownerId,
          `Dein Event wurde bestätigt. Viel Erfolg!\n\n${formatTemplateSummary(template)}\n\nEs ist jetzt für die Community sichtbar.`
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
            await commitChannel.send(
              `Commit für "${template.title}":\n\`\`\`json\n${content}\n\`\`\``
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
          .setLabel("Ja, wirklich zurücknehmen")
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
        content: `Veröffentlichung zurückgenommen: ${result.title}`,
        ephemeral: true
      });

      return;
    }
  } catch (error) {
    console.error("Button Error:", error);
    throw error;
  }
}

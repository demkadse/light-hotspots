import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";

import {
  createOrUpdateTemplate,
  findPotentialDuplicates
} from "../services/templateService.js";
import { replyAndExpire } from "../services/interactionResponseService.js";
import { validateEventInput } from "../validators/eventValidator.js";
import { recordAuditEntry } from "../services/auditService.js";

function normalizeOptional(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildTimeLabel(template) {
  if (template.time && template.end_time) {
    return `${template.time} - ${template.end_time}`;
  }

  return template.time || "-";
}

function buildPreviewEmbed(template, duplicates) {
  const embed = new EmbedBuilder()
    .setTitle(template.title || "Unbenannt")
    .setDescription(template.description || "-")
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
      name: "Moegliche Duplikate",
      value: duplicates
        .map(entry => `${entry.title} | ${entry.venue} | ${entry.date}`)
        .join("\n")
        .slice(0, 1024)
    });
  }

  return embed;
}

function buildWizardRow(templateId, stage = "step1") {
  const row = new ActionRowBuilder();

  if (stage === "step1") {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`event:details:${templateId}`)
        .setLabel("Weiter zu Details")
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (stage === "step2") {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`event:extras:${templateId}`)
        .setLabel("Weiter zu Extras")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`event:details:${templateId}`)
        .setLabel("Details bearbeiten")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (stage === "step3") {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`event:details:${templateId}`)
        .setLabel("Details bearbeiten")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`event:extras:${templateId}`)
        .setLabel("Extras bearbeiten")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`event:submit:${templateId}`)
      .setLabel("Zur Pruefung senden")
      .setStyle(ButtonStyle.Success)
  );

  return row;
}

function getTemplateIdFromModal(customId) {
  if (customId === "event_modal_step1_create") {
    return null;
  }

  if (customId.startsWith("event_modal_step1_")) {
    return customId.replace("event_modal_step1_", "");
  }

  if (customId.startsWith("event_modal_step2_")) {
    return customId.replace("event_modal_step2_", "");
  }

  if (customId.startsWith("event_modal_step3_")) {
    return customId.replace("event_modal_step3_", "");
  }

  return null;
}

async function replyWithPreview(interaction, template, stage, client, auditAction, isCreate = false) {
  const duplicates = await findPotentialDuplicates(template);

  await recordAuditEntry(client, {
    action: auditAction,
    actor_id: interaction.user.id,
    target_id: template.id,
    summary: template.title || "Unbenannt"
  });

  const contentByStage = {
    step1: "Basisdaten gespeichert. Du kannst jetzt die restlichen Angaben erfassen.",
    step2: "Details gespeichert. Optional kannst du jetzt noch Link und Hinweise pflegen.",
    step3: "Extras gespeichert."
  };

  await replyAndExpire(interaction, {
    content: isCreate
      ? "Event gespeichert. Du kannst jetzt die restlichen Angaben erfassen."
      : contentByStage[stage] || "Event gespeichert.",
    embeds: [buildPreviewEmbed(template, duplicates)],
    components: [buildWizardRow(template.id, stage)],
    ephemeral: true
  }, 120000);
}

export async function handleModal(interaction, client) {
  if (interaction.customId === "event_modal_step1_create" || interaction.customId.startsWith("event_modal_step1_")) {
    const templateId = getTemplateIdFromModal(interaction.customId);
    const data = {
      title: interaction.fields.getTextInputValue("title").trim(),
      venue: interaction.fields.getTextInputValue("venue").trim(),
      date: interaction.fields.getTextInputValue("date").trim(),
      time: interaction.fields.getTextInputValue("time").trim(),
      description: interaction.fields.getTextInputValue("description").trim(),
      status: "draft"
    };

    const errors = validateEventInput(data);
    if (errors.length > 0) {
      await replyAndExpire(interaction, {
        content: errors.join("\n"),
        ephemeral: true
      }, 45000);
      return;
    }

    const template = await createOrUpdateTemplate(data, interaction.user.id, templateId);
    await replyWithPreview(
      interaction,
      template,
      "step1",
      client,
      templateId ? "template.updated" : "template.created",
      !templateId
    );
    return;
  }

  if (interaction.customId.startsWith("event_modal_step2_")) {
    const templateId = getTemplateIdFromModal(interaction.customId);
    const data = {
      end_time: normalizeOptional(interaction.fields.getTextInputValue("end_time")),
      event_type: normalizeOptional(interaction.fields.getTextInputValue("event_type")),
      host_display_name: normalizeOptional(interaction.fields.getTextInputValue("host_display_name")),
      venue_lead: normalizeOptional(interaction.fields.getTextInputValue("venue_lead")),
      image: normalizeOptional(interaction.fields.getTextInputValue("image"))
    };

    const errors = validateEventInput({
      end_time: data.end_time,
      image: data.image
    });

    if (errors.length > 0) {
      await replyAndExpire(interaction, {
        content: errors.join("\n"),
        ephemeral: true
      }, 45000);
      return;
    }

    const template = await createOrUpdateTemplate(data, interaction.user.id, templateId);
    await replyWithPreview(interaction, template, "step2", client, "template.details_updated");
    return;
  }

  if (interaction.customId.startsWith("event_modal_step3_")) {
    const templateId = getTemplateIdFromModal(interaction.customId);
    const data = {
      link: normalizeOptional(interaction.fields.getTextInputValue("link")),
      notes: normalizeOptional(interaction.fields.getTextInputValue("notes"))
    };

    const errors = validateEventInput({ link: data.link });
    if (errors.length > 0) {
      await replyAndExpire(interaction, {
        content: errors.join("\n"),
        ephemeral: true
      }, 45000);
      return;
    }

    const template = await createOrUpdateTemplate(data, interaction.user.id, templateId);
    await replyWithPreview(interaction, template, "step3", client, "template.extras_updated");
  }
}

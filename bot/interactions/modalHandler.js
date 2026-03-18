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

function buildPreviewEmbed(template, duplicates) {
  const embed = new EmbedBuilder()
    .setTitle(template.title || "Unbenannt")
    .setDescription(template.description || "-")
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

  return embed;
}

export async function handleModal(interaction, client) {
  let templateId = null;

  if (interaction.customId.startsWith("event_modal_edit_")) {
    templateId = interaction.customId.split("_").pop();
  }

  if (
    interaction.customId === "event_modal_create" ||
    interaction.customId.startsWith("event_modal_edit_")
  ) {
    const data = {
      title: interaction.fields.getTextInputValue("title"),
      venue: interaction.fields.getTextInputValue("venue"),
      date: interaction.fields.getTextInputValue("date"),
      time: interaction.fields.getTextInputValue("time"),
      description: interaction.fields.getTextInputValue("description"),
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

    const template = await createOrUpdateTemplate(
      data,
      interaction.user.id,
      templateId
    );
    const duplicates = await findPotentialDuplicates(template);

    await recordAuditEntry(client, {
      action: templateId ? "template.updated" : "template.created",
      actor_id: interaction.user.id,
      target_id: template.id,
      summary: template.title || "Unbenannt"
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:setImage:${template.id}`)
        .setLabel("Bild hinzufuegen")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`event:submit:${template.id}`)
        .setLabel("Zur Pruefung senden")
        .setStyle(ButtonStyle.Success)
    );

    await replyAndExpire(interaction, {
      content: duplicates.length > 0
        ? "Event gespeichert. Bitte Duplikatwarnung in der Vorschau pruefen."
        : "Event gespeichert.",
      embeds: [buildPreviewEmbed(template, duplicates)],
      components: [row],
      ephemeral: true
    }, 120000);

    return;
  }

  if (interaction.customId.startsWith("event_image_modal_")) {
    const templateId = interaction.customId.split("_").pop();
    const image = interaction.fields.getTextInputValue("image");

    const errors = validateEventInput({ image });
    if (errors.length > 0) {
      await replyAndExpire(interaction, {
        content: errors.join("\n"),
        ephemeral: true
      }, 45000);
      return;
    }

    await createOrUpdateTemplate(
      { image },
      interaction.user.id,
      templateId
    );

    await recordAuditEntry(client, {
      action: "template.image_updated",
      actor_id: interaction.user.id,
      target_id: templateId,
      summary: "Bild aktualisiert"
    });

    await replyAndExpire(interaction, {
      content: "Bild gespeichert.",
      ephemeral: true
    });
  }
}

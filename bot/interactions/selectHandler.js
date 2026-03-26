import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { getTemplate } from "../services/templateService.js";
import { replyAndExpire } from "../services/interactionResponseService.js";
import { assertAdminUser } from "../services/permissionService.js";

export async function handleSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "admin:selectUnpublishEvent") {
    assertAdminUser(interaction);

    const templateId = interaction.values[0];
    const template = await getTemplate(templateId);

    if (!template) {
      await replyAndExpire(interaction, {
        content: "Das ausgewählte Event wurde nicht gefunden.",
        ephemeral: true
      });
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:unpublish:${template.id}`)
        .setLabel("Veröffentlichung zurücknehmen")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("event:unpublish_cancel:selection")
        .setLabel("Abbrechen")
        .setStyle(ButtonStyle.Secondary)
    );

    await replyAndExpire(interaction, {
      content: `Ausgewählt: ${template.title} (${template.date})`,
      components: [row],
      ephemeral: true
    }, 120000);
    return;
  }

  if (interaction.customId !== "event:selectTemplate") return;

  const value = interaction.values[0];
  const template = await getTemplate(value);

  const modal = new ModalBuilder()
    .setCustomId(`event_modal_step1_${value}`)
    .setTitle("1/3 | Basis");

  const createInput = (id, label, placeholder, val = "") =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setPlaceholder(placeholder)
        .setValue(val || "")
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

  await interaction.showModal(modal);
}

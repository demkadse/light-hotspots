import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";

import { getTemplate } from "../services/templateService.js";

export async function handleSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "event:selectTemplate") return;

  const value = interaction.values[0];

  let template = null;
  let modalId = "event_modal_create";

  if (value !== "new") {
    template = await getTemplate(value);
    modalId = `event_modal_edit_${value}`;
  }

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("Event erstellen");

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
    createInput("description", "Beschreibung", "Text...", template?.description)
  );

  await interaction.showModal(modal);
}
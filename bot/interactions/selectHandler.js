import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";

import { getTemplateById } from "../services/templateService.js";

export async function handleSelect(interaction) {

  if (interaction.customId !== "template_select") return;

  const selected = interaction.values[0];

  let template = null;

  if (selected !== "new_template") {
    template = await getTemplateById(selected);
  }

  const modal = new ModalBuilder()
    .setCustomId(`event_modal_${selected}`)
    .setTitle(selected === "new_template" ? "Neues Template" : "Event erstellen");

  const title = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Event Name")
    .setStyle(TextInputStyle.Short)
    .setValue(template?.title || "")
    .setRequired(true);

  const venue = new TextInputBuilder()
    .setCustomId("venue")
    .setLabel("Venue")
    .setStyle(TextInputStyle.Short)
    .setValue(template?.venue || "")
    .setRequired(true);

  const date = new TextInputBuilder()
    .setCustomId("date")
    .setLabel("Datum (YYYY-MM-DD)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const time = new TextInputBuilder()
    .setCustomId("time")
    .setLabel("Startzeit (HH:MM)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const description = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Beschreibung")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(template?.description || "")
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(venue),
    new ActionRowBuilder().addComponents(date),
    new ActionRowBuilder().addComponents(time),
    new ActionRowBuilder().addComponents(description)
  );

  await interaction.showModal(modal);

}
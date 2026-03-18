import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";

export async function handleButton(interaction) {

  if (interaction.customId !== "create_event") return;

  const modal = new ModalBuilder()
    .setCustomId("event_modal")
    .setTitle("Event erstellen");

  const title = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Event Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const venue = new TextInputBuilder()
    .setCustomId("venue")
    .setLabel("Venue")
    .setStyle(TextInputStyle.Short)
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

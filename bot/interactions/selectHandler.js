import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";

export async function handleSelect(interaction) {

  if (interaction.customId !== "template_select") return;

  const selected = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`event_modal_${selected}`)
    .setTitle("Event erstellen");

  const fields = [
    ["title", "Event Name"],
    ["venue", "Venue"],
    ["date", "Datum (YYYY-MM-DD)"],
    ["time", "Startzeit (HH:MM)"],
    ["description", "Beschreibung"]
  ];

  const rows = fields.map(([id, label]) => {
    return new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(id === "description" ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(true)
    );
  });

  modal.addComponents(...rows);

  await interaction.showModal(modal);

}
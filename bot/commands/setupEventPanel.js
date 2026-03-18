import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("setup-events")
  .setDescription("Erstellt das Event Panel");

export async function execute(interaction) {
  const button = new ButtonBuilder()
    .setCustomId("event:create")
    .setLabel("Event erstellen")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  await interaction.reply({
    content: "📅 **Event-System**\nErstelle hier neue Events.",
    components: [row]
  });
}
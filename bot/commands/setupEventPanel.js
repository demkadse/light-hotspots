import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";

export const data = new SlashCommandBuilder()
  .setName("setup-events")
  .setDescription("Erstellt das Event Panel");

export async function execute(interaction) {
  assertAdminUser(interaction);
  assertActionCooldown(interaction.user.id, "setup-events", 10000);

  const button = new ButtonBuilder()
    .setCustomId("event:start")
    .setLabel("Start")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  await interaction.reply({
    content: "**Event-System**\nStarte hier den Event-Flow.",
    components: [row]
  });
}

import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} from "discord.js";

import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { replyAndExpire } from "../services/interactionResponseService.js";
import { upsertPanelMessage } from "../services/panelService.js";

export const data = new SlashCommandBuilder()
  .setName("setup-cleanup")
  .setDescription("Erstellt das Cleanup-Panel für Bot-Nachrichten")
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("Channel für das Cleanup-Panel")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export async function execute(interaction) {
  assertAdminUser(interaction);
  assertActionCooldown(interaction.user.id, "setup-cleanup", 10000);

  const targetChannel = interaction.options.getChannel("channel") || interaction.channel;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("admin:cleanup:start")
      .setLabel("Bot-Nachrichten bereinigen")
      .setStyle(ButtonStyle.Danger)
  );

  await upsertPanelMessage(targetChannel, interaction.client.user.id, ["admin:cleanup:start"], {
    content: "Admin-Cleanup für Bot-Nachrichten",
    components: [row]
  });

  await replyAndExpire(interaction, {
    content: `Cleanup-Panel wurde in <#${targetChannel.id}> aktualisiert.`,
    ephemeral: true
  });
}

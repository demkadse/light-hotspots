import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { replyAndExpire } from "../services/interactionResponseService.js";
import { upsertPanelMessage } from "../services/panelService.js";

export const data = new SlashCommandBuilder()
  .setName("setup-events")
  .setDescription("Erstellt das Event Panel");

export async function execute(interaction) {
  assertAdminUser(interaction);
  assertActionCooldown(interaction.user.id, "setup-events", 10000);
  const targetChannel = interaction.channel;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("event:start")
      .setLabel("Event-Flow oeffnen")
      .setStyle(ButtonStyle.Primary)
  );

  await upsertPanelMessage(targetChannel, interaction.client.user.id, ["event:start", "event:create"], {
    content: "**Event-System**\nOeffne hier den Event-Flow fuer Erstellung, Bearbeitung oder Absage.",
    components: [row]
  });

  await replyAndExpire(interaction, {
    content: `Event-Panel wurde in <#${targetChannel.id}> aktualisiert.`,
    ephemeral: true
  });
}

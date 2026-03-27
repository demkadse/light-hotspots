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
      .setCustomId("event:new:event")
      .setLabel("Event erstellen")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("event:new:venue")
      .setLabel("Venue erstellen")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("event:edit")
      .setLabel("Event bearbeiten")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("event:cancel")
      .setLabel("Event absagen")
      .setStyle(ButtonStyle.Secondary)
  );

  await upsertPanelMessage(targetChannel, interaction.client.user.id, ["event:start", "event:new:event", "event:new:venue", "event:edit", "event:cancel"], {
    content: "**Event-System**\nWaehle hier direkt, ob du ein Event oder eine Venue erstellen, ein bestehendes Event bearbeiten oder ein veroefentlichtes Event absagen moechtest.",
    components: [row]
  });

  await replyAndExpire(interaction, {
    content: `Event-Panel wurde in <#${targetChannel.id}> aktualisiert.`,
    ephemeral: true
  });
}

import {
  ActionRowBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from "discord.js";

import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { replyAndExpire } from "../services/interactionResponseService.js";
import { getPublishedTemplates } from "../services/templateService.js";

export const data = new SlashCommandBuilder()
  .setName("unpublish-event")
  .setDescription("Wählt ein veröffentlichtes Event zum Zurücknehmen aus");

export async function execute(interaction) {
  assertAdminUser(interaction);
  assertActionCooldown(interaction.user.id, "unpublish-event-command", 10000);

  const publishedTemplates = await getPublishedTemplates();

  if (publishedTemplates.length === 0) {
    await replyAndExpire(interaction, {
      content: "Es gibt aktuell keine veröffentlichten Events zum Unpublishen.",
      ephemeral: true
    });
    return;
  }

  const options = publishedTemplates
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.title || "").localeCompare(b.title || ""))
    .slice(0, 25)
    .map(template => ({
      label: (template.title || "Unbenannt").slice(0, 100),
      value: template.id,
      description: `${template.date || "kein Datum"} | ${template.venue || "kein Ort"}`.slice(0, 100)
    }));

  const select = new StringSelectMenuBuilder()
    .setCustomId("admin:selectUnpublishEvent")
    .setPlaceholder("Veröffentlichtes Event auswählen")
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  await replyAndExpire(interaction, {
    content: "Wähle das Event aus, das von der Website entfernt werden soll:",
    components: [row],
    ephemeral: true
  }, 120000);
}

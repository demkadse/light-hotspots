import { SlashCommandBuilder } from "discord.js";

import { assertAdminUser } from "../services/permissionService.js";
import { assertActionCooldown } from "../services/cooldownService.js";
import { deferEphemeral, replyAndExpire } from "../services/interactionResponseService.js";
import { recordAuditEntry } from "../services/auditService.js";
import { forcePostWeeklyCalendarFeed } from "../services/calendarFeedService.js";

export const data = new SlashCommandBuilder()
  .setName("force-calendar-feed")
  .setDescription("Postet die Wochenvorschau sofort in den Kalenderfeed");

export async function execute(interaction) {
  assertAdminUser(interaction);
  assertActionCooldown(interaction.user.id, "force-calendar-feed", 30000);
  await deferEphemeral(interaction);

  let result;

  try {
    result = await forcePostWeeklyCalendarFeed(interaction.client);
  } catch (error) {
    if (error.code === "CALENDAR_FEED_MISSING_PERMISSIONS") {
      await replyAndExpire(interaction, {
        content: [
          "Die Feed-Dateien wurden aktualisiert, aber der Bot darf im Kalenderfeed-Channel nicht posten.",
          "Bitte gib dem Bot dort `Nachrichten senden` und `Channel anzeigen`."
        ].join("\n"),
        ephemeral: true
      }, 120000);
      return;
    }

    throw error;
  }

  await recordAuditEntry(interaction.client, {
    action: "calendar_feed.forced",
    actor_id: interaction.user.id,
    summary: `Fenster ${result.startDate} bis ${result.endDate} | Nachrichten ${result.messageCount}`
  });

  const syncLabel = result.syncResult?.committed
    ? `Feed-Dateien aktualisiert und gepusht (${result.syncResult.branch}).`
    : "Feed-Dateien waren bereits aktuell.";

  await replyAndExpire(interaction, {
    content: [
      "Kalenderfeed gepostet.",
      `Zeitraum: ${result.startDate} bis ${result.endDate}`,
      `Ersetzte Feed-Nachrichten: ${result.replacedMessageCount ?? 0}`,
      `Discord-Nachrichten: ${result.messageCount}`,
      syncLabel
    ].join("\n"),
    ephemeral: true
  }, 120000);
}

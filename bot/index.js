import { Client, GatewayIntentBits } from "discord.js";

import { handleModal } from "./interactions/modalHandler.js";
import { handleButton } from "./interactions/buttonHandler.js";
import { handleRejectModal } from "./interactions/rejectModalHandler.js";
import { handleSelect } from "./interactions/selectHandler.js";

import { execute as setupEvents } from "./commands/setupEventPanel.js";
import { execute as setupCleanup } from "./commands/setupCleanupPanel.js";
import { execute as resyncEvents } from "./commands/resyncEvents.js";
import { execute as unpublishEvent } from "./commands/unpublishEvent.js";
import { execute as forceCalendarFeed } from "./commands/forceCalendarFeed.js";
import { CONFIG, validateConfig } from "./config/config.js";
import { replyAndExpire } from "./services/interactionResponseService.js";
import { processPendingReminders } from "./services/templateService.js";
import { CHANNELS } from "./config/channels.js";
import { getTemplateOwnerId } from "./services/identityService.js";
import { postWeeklyCalendarFeedIfDue } from "./services/calendarFeedService.js";
import { migrateAllPrivacyDataAndSync } from "./services/privacyMigrationService.js";

validateConfig();
await runPrivacyMigrationOnStartup();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

async function runPrivacyMigrationOnStartup() {
  try {
    const result = await migrateAllPrivacyDataAndSync();

    if (result.changed) {
      console.log(`Privacy migration updated ${result.changedFiles.length} file(s).`);
    }
  } catch (error) {
    console.error("PRIVACY MIGRATION ERROR:", error);
  }
}

async function runPendingReminderCheck() {
  try {
    const reminded = await processPendingReminders();

    if (reminded.length === 0) {
      return;
    }

    const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);
    if (!channel?.isTextBased()) {
      return;
    }

    const lines = [];
    for (const template of reminded) {
      const ownerId = await getTemplateOwnerId(template);
      const ownerLabel = ownerId ? `<@${ownerId}>` : "unbekannt";
      lines.push(
        `Offen seit längerer Zeit: ${template.title} (${template.date} ${template.time}) von ${ownerLabel}`
      );
    }

    await channel.send({
      content: `Reminder für offene Approvals:\n${lines.join("\n")}`
    });
  } catch (error) {
    console.error("PENDING REMINDER ERROR:", error);
  }
}

async function runCalendarFeedCheck() {
  try {
    const result = await postWeeklyCalendarFeedIfDue(client);

    if (result.posted) {
      console.log(`Calendar feed posted for ${result.startDate} to ${result.endDate}`);
    }
  } catch (error) {
    console.error("CALENDAR FEED ERROR:", error);
  }
}

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-events") {
        return await setupEvents(interaction);
      }

      if (interaction.commandName === "setup-cleanup") {
        return await setupCleanup(interaction);
      }

      if (interaction.commandName === "resync-events") {
        return await resyncEvents(interaction);
      }

      if (interaction.commandName === "unpublish-event") {
        return await unpublishEvent(interaction);
      }

      if (interaction.commandName === "force-calendar-feed") {
        return await forceCalendarFeed(interaction);
      }
    }

    if (interaction.isButton()) {
      return await handleButton(interaction, client);
    }

    if (interaction.isStringSelectMenu()) {
      return await handleSelect(interaction);
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("reject_modal_")) {
        return await handleRejectModal(interaction, client);
      }

      return await handleModal(interaction, client);
    }
  } catch (error) {
    console.error("INTERACTION ERROR:", error);

    if (!interaction.replied && !interaction.deferred) {
      let content = "Fehler.";

      if (error.code === "ADMIN_ONLY") {
        content = "Diese Aktion ist nur für Admins verfügbar.";
      } else if (error.code === "ACTION_COOLDOWN") {
        content = error.message;
      } else if (error.code === "SYNC_PATH_FORBIDDEN") {
        content = "Der Bot darf diese Datei aus Sicherheitsgründen nicht automatisch pushen.";
      }

      try {
        await replyAndExpire(interaction, {
          content,
          ephemeral: true
        });
      } catch (replyError) {
        console.error("INTERACTION ERROR RESPONSE FAILED:", replyError);
      }
    }
  }
});

client.login(CONFIG.DISCORD_TOKEN);

setInterval(() => {
  void runPendingReminderCheck();
}, 15 * 60 * 1000);

setInterval(() => {
  void runCalendarFeedCheck();
}, 5 * 60 * 1000);

void runPendingReminderCheck();
void runCalendarFeedCheck();

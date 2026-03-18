import { Client, GatewayIntentBits } from "discord.js";

import { handleModal } from "./interactions/modalHandler.js";
import { handleButton } from "./interactions/buttonHandler.js";
import { handleRejectModal } from "./interactions/rejectModalHandler.js";
import { handleSelect } from "./interactions/selectHandler.js";

import { execute as setupEvents } from "./commands/setupEventPanel.js";
import { execute as setupCleanup } from "./commands/setupCleanupPanel.js";
import { execute as resyncEvents } from "./commands/resyncEvents.js";
import { execute as unpublishEvent } from "./commands/unpublishEvent.js";
import { CONFIG, validateConfig } from "./config/config.js";
import { replyAndExpire } from "./services/interactionResponseService.js";
import { processPendingReminders } from "./services/templateService.js";
import { CHANNELS } from "./config/channels.js";

validateConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

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

    const lines = reminded.map(template =>
      `Offen seit laengerer Zeit: ${template.title} (${template.date} ${template.time}) von <@${template.created_by}>`
    );

    await channel.send({
      content: `Reminder fuer offene Approvals:\n${lines.join("\n")}`
    });
  } catch (error) {
    console.error("PENDING REMINDER ERROR:", error);
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
        content = "Diese Aktion ist nur fuer Admins verfuegbar.";
      } else if (error.code === "ACTION_COOLDOWN") {
        content = error.message;
      } else if (error.code === "SYNC_PATH_FORBIDDEN") {
        content = "Der Bot darf diese Datei aus Sicherheitsgruenden nicht automatisch pushen.";
      }

      await replyAndExpire(interaction, {
        content,
        ephemeral: true
      });
    }
  }
});

client.login(CONFIG.DISCORD_TOKEN);

setInterval(() => {
  void runPendingReminderCheck();
}, 15 * 60 * 1000);

void runPendingReminderCheck();

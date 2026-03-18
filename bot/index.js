import { Client, GatewayIntentBits } from "discord.js";

import { handleModal } from "./interactions/modalHandler.js";
import { handleButton } from "./interactions/buttonHandler.js";
import { handleRejectModal } from "./interactions/rejectModalHandler.js";
import { handleSelect } from "./interactions/selectHandler.js";

import { execute as setupEvents } from "./commands/setupEventPanel.js";
import { CONFIG, validateConfig } from "./config/config.js";

validateConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {

    // COMMANDS
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-events") {
        return await setupEvents(interaction);
      }
    }

    // BUTTONS
    if (interaction.isButton()) {
      return await handleButton(interaction, client);
    }

    // 🔥 FEHLTE BEI DIR
    if (interaction.isStringSelectMenu()) {
      return await handleSelect(interaction);
    }

    // MODALS
    if (interaction.isModalSubmit()) {

      if (interaction.customId.startsWith("reject_modal_")) {
        return await handleRejectModal(interaction, client);
      }

      return await handleModal(interaction, client);
    }

  } catch (err) {
    console.error("INTERACTION ERROR:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Fehler.",
        ephemeral: true
      });
    }
  }
});

client.login(CONFIG.DISCORD_TOKEN);

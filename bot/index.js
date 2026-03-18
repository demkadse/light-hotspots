import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

import { handleModal } from "./interactions/modalHandler.js";
import { handleButton } from "./interactions/buttonHandler.js";
import { handleRejectModal } from "./interactions/rejectModalHandler.js";

import { execute as setupEvents } from "./commands/setupEventPanel.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-events") {
        return await setupEvents(interaction);
      }
    }

    if (interaction.isButton()) {
      return await handleButton(interaction, client);
    }

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

client.login(process.env.DISCORD_TOKEN);
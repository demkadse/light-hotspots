import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

import { handleButton } from "./interactions/buttonHandler.js";
import { handleModal } from "./interactions/modalHandler.js";
import { data as setupData, execute as setupExecute } from "./commands/setupEventPanel.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {

  try {

    // Slash Commands
    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "setup-events") {
        await setupExecute(interaction);
      }

    }

    // Button
    if (interaction.isButton()) {
      await handleButton(interaction);
    }

    // Modal
    if (interaction.isModalSubmit()) {
      await handleModal(interaction, client);
    }

  } catch (error) {

    console.error("Interaction Fehler:", error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "❌ Fehler bei der Verarbeitung.",
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: "❌ Fehler bei der Verarbeitung.",
        ephemeral: true
      });
    }

  }

});

client.login(process.env.DISCORD_TOKEN);

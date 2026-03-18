import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

import { handleButton } from "./interactions/buttonHandler.js";
import { handleModal } from "./interactions/modalHandler.js";
import { handleSelect } from "./interactions/selectHandler.js";
import { execute as setupExecute } from "./commands/setupEventPanel.js";

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
        await setupExecute(interaction);
      }
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction, client);
    }

  } catch (error) {

    console.error("Global Interaction Error:", error);

    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ Unerwarteter Fehler",
        flags: 64
      });
    }

  }

});

client.login(process.env.DISCORD_TOKEN);
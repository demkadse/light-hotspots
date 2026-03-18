import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

import { handleModal } from "./interactions/modalHandler.js";
import { handleButton } from "./interactions/buttonHandler.js";
import { handleRejectModal } from "./interactions/rejectModalHandler.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {

  try {

    if (interaction.isButton()) {
      await handleButton(interaction, client);
    }

    if (interaction.isModalSubmit()) {
      await handleRejectModal(interaction, client);
      await handleModal(interaction, client);
    }

  } catch (err) {

    console.error(err);

    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ Fehler",
        flags: 64
      });
    }

  }

});

client.login(process.env.DISCORD_TOKEN);
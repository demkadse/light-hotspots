console.log("SCRIPT STARTET");

import { REST, Routes, SlashCommandBuilder, ChannelType } from "discord.js";
import { CONFIG, validateConfig } from "./config/config.js";

validateConfig();

const commands = [
  new SlashCommandBuilder()
    .setName("setup-events")
    .setDescription("Erstellt das Event Panel"),
  new SlashCommandBuilder()
    .setName("setup-cleanup")
    .setDescription("Erstellt das Cleanup Panel")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel fuer das Cleanup-Panel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("resync-events")
    .setDescription("Prueft oder repariert events/data/index.json")
    .addBooleanOption(option =>
      option
        .setName("fix")
        .setDescription("Index automatisch reparieren")
        .setRequired(false)
    )
];

const rest = new REST({ version: "10" }).setToken(CONFIG.DISCORD_TOKEN);

async function register() {

  try {

    console.log("Registriere Guild Commands...");

    const result = await rest.put(
      Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID),
      { body: commands.map(cmd => cmd.toJSON()) }
    );

    console.log("RESULT:", result);

  } catch (error) {

    console.error("FEHLER:", error);

  }

}

register();

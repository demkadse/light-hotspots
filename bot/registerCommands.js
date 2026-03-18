console.log("SCRIPT STARTET");

import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = "1483031945825747034";
const GUILD_ID = "1483034141858598965";

const commands = [
  new SlashCommandBuilder()
    .setName("setup-events")
    .setDescription("Erstellt das Event Panel")
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function register() {

  try {

    console.log("Registriere Guild Commands...");

    const result = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(cmd => cmd.toJSON()) }
    );

    console.log("RESULT:", result);

  } catch (error) {

    console.error("FEHLER:", error);

  }

}

register();

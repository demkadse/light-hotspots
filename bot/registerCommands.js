import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

// 👉 HIER EINTRAGEN
const CLIENT_ID = "1483031945825747034";
const GUILD_ID = "1483034141858598965";

const commands = [
  new SlashCommandBuilder()
    .setName("setup-events")
    .setDescription("Erstellt das Event Panel")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function register() {

  try {

    console.log("Token vorhanden:", !!process.env.DISCORD_TOKEN);
    console.log("Client ID:", CLIENT_ID);
    console.log("Guild ID:", GUILD_ID);

    console.log("Registriere Commands...");

    const response = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Discord Response:", response);

    console.log("FERTIG.");

  } catch (error) {

    console.error("FEHLER:", error);

  }

}

register();

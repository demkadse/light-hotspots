import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName("setup-events")
    .setDescription("Erstellt das Event Panel")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// ⚠️ HIER DEINE APPLICATION ID EINTRAGEN
const CLIENT_ID = "1483031945825747034";

async function register() {

  try {

    console.log("Registriere Slash Commands...");

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log("Slash Commands registriert.");

  } catch (error) {

    console.error("Fehler beim Registrieren:", error);

  }

}

register();

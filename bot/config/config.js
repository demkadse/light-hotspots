import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { CHANNELS } from "./channels.js";
import { ROLES } from "./roles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(BOT_ROOT, ".env") });

function validateDiscordId(name, value) {
  if (!value || !/^\d{17,20}$/.test(value)) {
    throw new Error(`Ungültige oder fehlende Discord-ID für ${name}`);
  }
}

function validateRequired(name, value) {
  if (!value) {
    throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  }
}

export const CONFIG = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_OWNER: process.env.GITHUB_OWNER,
  GITHUB_REPO: process.env.GITHUB_REPO,
  DISCORD_INVITE_URL: process.env.DISCORD_INVITE_URL || "",
  EVENT_DATA_PATH: "events/data"
};

export function validateConfig() {
  validateRequired("DISCORD_TOKEN", CONFIG.DISCORD_TOKEN);
  validateRequired("CLIENT_ID", CONFIG.CLIENT_ID);
  validateRequired("GUILD_ID", CONFIG.GUILD_ID);

  validateDiscordId("CLIENT_ID", CONFIG.CLIENT_ID);
  validateDiscordId("GUILD_ID", CONFIG.GUILD_ID);

  Object.entries(CHANNELS).forEach(([name, value]) => {
    validateDiscordId(`CHANNELS.${name}`, value);
  });

  Object.entries(ROLES).forEach(([name, value]) => {
    validateDiscordId(`ROLES.${name}`, value);
  });
}

export function hasGitHubConfig() {
  return Boolean(
    CONFIG.GITHUB_TOKEN &&
    CONFIG.GITHUB_OWNER &&
    CONFIG.GITHUB_REPO
  );
}

export function validateGitHubConfig() {
  validateRequired("GITHUB_TOKEN", CONFIG.GITHUB_TOKEN);
  validateRequired("GITHUB_OWNER", CONFIG.GITHUB_OWNER);
  validateRequired("GITHUB_REPO", CONFIG.GITHUB_REPO);
}

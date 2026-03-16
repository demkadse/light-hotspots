import dotenv from "dotenv";

dotenv.config();

export const CONFIG = {

DISCORD_TOKEN: process.env.DISCORD_TOKEN,

GITHUB_TOKEN: process.env.GITHUB_TOKEN,

GITHUB_OWNER: process.env.GITHUB_OWNER,

GITHUB_REPO: process.env.GITHUB_REPO,

EVENT_DATA_PATH: "events/data"

};
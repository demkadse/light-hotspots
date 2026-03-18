import { Octokit } from "@octokit/rest";
import { CONFIG, validateGitHubConfig } from "../config/config.js";

function getGitHubClient() {
  validateGitHubConfig();
  return new Octokit({
    auth: CONFIG.GITHUB_TOKEN
  });
}

function getTodayFile() {
  const date = new Date().toISOString().split("T")[0];
  return `logs/events/${date}.json`;
}

export async function logEvent(entry) {
  const path = getTodayFile();
  const octokit = getGitHubClient();

  try {
    const { data } = await octokit.repos.getContent({
      owner: CONFIG.GITHUB_OWNER,
      repo: CONFIG.GITHUB_REPO,
      path
    });

    const existingEntries = JSON.parse(
      Buffer.from(data.content, "base64").toString()
    );

    await octokit.repos.createOrUpdateFileContents({
      owner: CONFIG.GITHUB_OWNER,
      repo: CONFIG.GITHUB_REPO,
      path,
      message: `Update log ${path}`,
      content: Buffer.from(
        JSON.stringify([...existingEntries, entry], null, 2)
      ).toString("base64"),
      sha: data.sha
    });
  } catch (error) {
    await octokit.repos.createOrUpdateFileContents({
      owner: CONFIG.GITHUB_OWNER,
      repo: CONFIG.GITHUB_REPO,
      path,
      message: `Create log ${path}`,
      content: Buffer.from(
        JSON.stringify([entry], null, 2)
      ).toString("base64")
    });
  }
}

export async function logToDiscord(client, channelId, message) {
  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel) return;

    await channel.send(message);
  } catch (error) {
    console.error("Discord Logging Fehler:", error);
  }
}

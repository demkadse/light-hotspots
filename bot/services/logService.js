import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

function getTodayFile() {
  const date = new Date().toISOString().split("T")[0];
  return `logs/events/${date}.json`;
}

export async function logEvent(entry) {
  const path = getTodayFile();

  let content = [];

  try {
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path
    });

    const decoded = JSON.parse(
      Buffer.from(data.content, "base64").toString()
    );

    content = decoded;

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Update log ${path}`,
      content: Buffer.from(
        JSON.stringify([...content, entry], null, 2)
      ).toString("base64"),
      sha: data.sha
    });

  } catch (err) {

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Create log ${path}`,
      content: Buffer.from(
        JSON.stringify([entry], null, 2)
      ).toString("base64")
    });
  }
}

import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

const PATH = "events/templates";

export async function getTemplates() {

  try {

    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: PATH
    });

    const templates = [];

    for (const file of data) {

      if (!file.name.endsWith(".json")) continue;

      try {

        const content = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: file.path
        });

        const decoded = JSON.parse(
          Buffer.from(content.data.content, "base64").toString()
        );

        templates.push(decoded);

      } catch (err) {

        console.error("Template Fehler:", file.name, err.message);

      }

    }

    return templates;

  } catch (err) {

    console.error("Template Load Error:", err);
    return [];

  }

}
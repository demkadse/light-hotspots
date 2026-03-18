import { Octokit } from "@octokit/rest";
import { CONFIG, validateGitHubConfig } from "../config/config.js";

function getGitHubClient() {
  validateGitHubConfig();
  return new Octokit({
    auth: CONFIG.GITHUB_TOKEN
  });
}

function generateId(title, date) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${date}`;
}

export async function createEventFromTemplate(template) {
  const id = generateId(template.title, template.date);
  const [year, month] = template.date.split("-");
  const path = `events/data/${year}/${month}/${id}.json`;

  const event = {
    id,
    template_id: template.id,
    title: template.title,
    venue: template.venue,
    date: template.date,
    start_time: template.time,
    description: template.description,
    image: template.image || null,
    created_at: new Date().toISOString()
  };

  const octokit = getGitHubClient();

  await octokit.repos.createOrUpdateFileContents({
    owner: CONFIG.GITHUB_OWNER,
    repo: CONFIG.GITHUB_REPO,
    path,
    message: `Create event ${id}`,
    content: Buffer.from(JSON.stringify(event, null, 2)).toString("base64")
  });

  return event;
}

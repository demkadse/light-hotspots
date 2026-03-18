import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

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

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path,
    message: `Create event ${id}`,
    content: Buffer.from(JSON.stringify(event, null, 2)).toString("base64")
  });

  return event;
}
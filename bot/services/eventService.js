import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

function generateId(title, date) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug}-${date}`;
}

function getPath(date, id) {
  const [year, month] = date.split("-");
  return `events/data/${year}/${month}/${id}.json`;
}

function validateEvent(event) {

  if (!event.title || event.title.length < 3) {
    throw new Error("Ungültiger Event-Titel");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    throw new Error("Datum muss YYYY-MM-DD sein");
  }

  if (!/^\d{2}:\d{2}$/.test(event.start_time)) {
    throw new Error("Startzeit muss HH:MM sein");
  }

}

export async function createEvent(event) {

  validateEvent(event);

  const id = generateId(event.title, event.date);
  const path = getPath(event.date, id);

  const fullEvent = {
    ...event,
    id
  };

  try {

    await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path
    });

    throw new Error("Event existiert bereits");

  } catch (err) {

    if (err.status !== 404) throw err;

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Create event ${id}`,
      content: Buffer.from(
        JSON.stringify(fullEvent, null, 2)
      ).toString("base64")
    });

  }

  return fullEvent;

}
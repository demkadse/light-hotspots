import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

const PATH = "events/templates";

function encode(data) {
  return Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
}

export async function createOrUpdateTemplate(template, userId) {

  const id = template.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const path = `${PATH}/${id}.json`;

  let sha = null;

  try {
    const existing = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path
    });

    sha = existing.data.sha;

  } catch (err) {
    if (err.status !== 404) throw err;
  }

  const full = {
    ...template,
    id,
    status: "pending",
    rejection_reason: null,
    created_by: userId,
    updated_at: new Date().toISOString()
  };

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path,
    message: `${sha ? "Update" : "Create"} template ${id}`,
    content: encode(full),
    ...(sha && { sha })
  });

  return full;
}

export async function updateTemplateStatus(id, updates) {

  const path = `${PATH}/${id}.json`;

  const file = await octokit.repos.getContent({
    owner: OWNER,
    repo: REPO,
    path
  });

  const data = JSON.parse(
    Buffer.from(file.data.content, "base64").toString()
  );

  const updated = {
    ...data,
    ...updates,
    updated_at: new Date().toISOString()
  };

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path,
    message: `Update template status ${id}`,
    content: encode(updated),
    sha: file.data.sha
  });

  return updated;
}

export async function getTemplateById(id) {

  const path = `${PATH}/${id}.json`;

  const file = await octokit.repos.getContent({
    owner: OWNER,
    repo: REPO,
    path
  });

  return JSON.parse(
    Buffer.from(file.data.content, "base64").toString()
  );
}
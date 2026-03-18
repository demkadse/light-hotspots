import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

const TEMPLATE_PATH = "events/templates";
const ARCHIVE_PATH = "events/templates/archive";

// ---------- Helpers ----------

function generateTemplateId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function encode(data) {
  return Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
}

async function fileExists(path) {
  try {
    await octokit.repos.getContent({ owner: OWNER, repo: REPO, path });
    return true;
  } catch (err) {
    if (err.status === 404) return false;
    throw err;
  }
}

// ---------- Public ----------

export async function getTemplates() {

  try {

    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: TEMPLATE_PATH
    });

    const templates = [];

    for (const file of data) {

      if (!file.name.endsWith(".json")) continue;

      const content = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: file.path
      });

      const decoded = JSON.parse(
        Buffer.from(content.data.content, "base64").toString()
      );

      templates.push(decoded);

    }

    return templates;

  } catch (err) {
    return [];
  }

}

export async function getTemplateById(templateId) {

  const path = `${TEMPLATE_PATH}/${templateId}.json`;

  const { data } = await octokit.repos.getContent({
    owner: OWNER,
    repo: REPO,
    path
  });

  return JSON.parse(
    Buffer.from(data.content, "base64").toString()
  );

}

export async function createOrUpdateTemplate(template, userId, createBackup = false) {

  const id = generateTemplateId(template.title);
  const path = `${TEMPLATE_PATH}/${id}.json`;

  const exists = await fileExists(path);

  if (exists) {

    const current = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path
    });

    const oldData = JSON.parse(
      Buffer.from(current.data.content, "base64").toString()
    );

    // Backup erstellen wenn gewünscht
    if (createBackup) {

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archivePath = `${ARCHIVE_PATH}/${id}-${timestamp}.json`;

      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: archivePath,
        message: `Backup template ${id}`,
        content: encode(oldData)
      });

    }

    // Update
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Update template ${id}`,
      content: encode({
        ...template,
        id,
        updated_at: new Date().toISOString(),
        updated_by: userId
      }),
      sha: current.data.sha
    });

    return id;

  } else {

    // Neu erstellen
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Create template ${id}`,
      content: encode({
        ...template,
        id,
        created_at: new Date().toISOString(),
        created_by: userId
      })
    });

    return id;

  }

}
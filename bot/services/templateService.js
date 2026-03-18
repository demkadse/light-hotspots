import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const DATA_PATH = path.resolve("data/templates.json");

// ---------- Helper ----------

async function ensureDataFile() {
  const dir = path.dirname(DATA_PATH);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, "[]", "utf-8");
  }
}

async function readTemplates() {
  await ensureDataFile();
  const data = await fs.readFile(DATA_PATH, "utf-8");
  return JSON.parse(data);
}

async function writeTemplates(data) {
  await ensureDataFile();
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ---------- Core ----------

export async function createOrUpdateTemplate(data, userId, templateId = null) {
  const templates = await readTemplates();

  if (templateId) {
    const index = templates.findIndex(t => t.id === templateId);
    if (index === -1) throw new Error("Template nicht gefunden");

    templates[index] = {
      ...templates[index],
      ...data,
      updated_at: new Date().toISOString()
    };

    await writeTemplates(templates);
    return templates[index];
  }

  const newTemplate = {
    id: crypto.randomUUID(),
    ...data,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: null
  };

  templates.push(newTemplate);
  await writeTemplates(templates);

  return newTemplate;
}

export async function getTemplate(templateId) {
  const templates = await readTemplates();
  const template = templates.find(t => t.id === templateId);
  if (!template) throw new Error("Template nicht gefunden");
  return template;
}

export async function submitTemplateForApproval(templateId) {
  const templates = await readTemplates();

  const index = templates.findIndex(t => t.id === templateId);
  if (index === -1) throw new Error("Template nicht gefunden");

  templates[index].status = "pending";
  templates[index].updated_at = new Date().toISOString();

  await writeTemplates(templates);
  return templates[index];
}

// 🔥 HIER WAR DER FEHLENDE TEIL
export async function approveTemplate(templateId) {
  const templates = await readTemplates();

  const index = templates.findIndex(t => t.id === templateId);
  if (index === -1) throw new Error("Template nicht gefunden");

  templates[index].status = "approved";
  templates[index].updated_at = new Date().toISOString();

  await writeTemplates(templates);
  return templates[index];
}

export async function rejectTemplate(templateId, reason) {
  const templates = await readTemplates();

  const index = templates.findIndex(t => t.id === templateId);
  if (index === -1) throw new Error("Template nicht gefunden");

  templates[index].status = "rejected";
  templates[index].rejection_reason = reason;
  templates[index].updated_at = new Date().toISOString();

  await writeTemplates(templates);
  return templates[index];
}
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const DATA_PATH = path.resolve("bot/data/templates.json");

// ---------- Helper ----------

async function readTemplates() {
  try {
    const data = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await writeTemplates([]);
      return [];
    }
    throw err;
  }
}

async function writeTemplates(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ---------- Core Functions ----------

// 🟢 CREATE / UPDATE
export async function createOrUpdateTemplate(data, userId, templateId = null) {
  const templates = await readTemplates();

  // 🔹 UPDATE
  if (templateId) {
    const index = templates.findIndex(t => t.id === templateId);

    if (index === -1) {
      throw new Error("Template nicht gefunden");
    }

    templates[index] = {
      ...templates[index],
      ...data,
      updated_at: new Date().toISOString()
    };

    await writeTemplates(templates);
    return templates[index];
  }

  // 🔹 CREATE
  const newTemplate = {
    id: crypto.randomUUID(),
    title: data.title,
    venue: data.venue,
    date: data.date,
    time: data.time,
    description: data.description,
    image: data.image || null,
    status: data.status || "draft",

    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: null
  };

  templates.push(newTemplate);
  await writeTemplates(templates);

  return newTemplate;
}

// 🟢 GET SINGLE
export async function getTemplate(templateId) {
  const templates = await readTemplates();

  const template = templates.find(t => t.id === templateId);

  if (!template) {
    throw new Error("Template nicht gefunden");
  }

  return template;
}

// 🟢 SUBMIT FOR APPROVAL
export async function submitTemplateForApproval(templateId) {
  const templates = await readTemplates();

  const index = templates.findIndex(t => t.id === templateId);

  if (index === -1) {
    throw new Error("Template nicht gefunden");
  }

  const template = templates[index];

  // 🔥 Validierung
  if (!template.title || !template.date || !template.time) {
    throw new Error("Template unvollständig");
  }

  templates[index].status = "pending";
  templates[index].updated_at = new Date().toISOString();

  await writeTemplates(templates);

  return templates[index];
}

// 🟢 APPROVE
export async function approveTemplate(templateId) {
  const templates = await readTemplates();

  const index = templates.findIndex(t => t.id === templateId);

  if (index === -1) {
    throw new Error("Template nicht gefunden");
  }

  templates[index].status = "approved";
  templates[index].updated_at = new Date().toISOString();

  await writeTemplates(templates);

  return templates[index];
}

// 🟢 REJECT
export async function rejectTemplate(templateId, reason = null) {
  const templates = await readTemplates();

  const index = templates.findIndex(t => t.id === templateId);

  if (index === -1) {
    throw new Error("Template nicht gefunden");
  }

  templates[index].status = "rejected";
  templates[index].rejection_reason = reason;
  templates[index].updated_at = new Date().toISOString();

  await writeTemplates(templates);

  return templates[index];
}

// 🟢 GET ALL
export async function getAllTemplates() {
  return await readTemplates();
}
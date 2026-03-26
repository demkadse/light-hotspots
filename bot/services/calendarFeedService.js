import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { CHANNELS } from "../config/channels.js";
import { syncRepoFiles } from "./gitSyncService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(BOT_ROOT, "..");
const EVENTS_ROOT = path.join(REPO_ROOT, "events", "data");
const INDEX_PATH = path.join(EVENTS_ROOT, "index.json");
const FEED_DIR = path.join(REPO_ROOT, "feeds");
const RSS_PATH = path.join(FEED_DIR, "weekly-summary.xml");
const JSON_PATH = path.join(FEED_DIR, "weekly-summary.json");
const PRIVATE_STATE_PATH = path.join(BOT_ROOT, "data", "private-calendar-feed-state.json");
const SITE_URL = "https://light-hotspots.talaani.de";
const FEED_URL = `${SITE_URL}/feeds/weekly-summary.xml`;
const TIME_ZONE = "Europe/Berlin";
const DISCORD_LIMIT = 2000;

function formatDateInBerlin(date, options) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TIME_ZONE,
    ...options
  }).format(date);
}

function getBerlinDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);

  const get = type => parts.find(part => part.type === type)?.value;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute"))
  };
}

export function getBerlinDateKey(date = new Date()) {
  const { year, month, day } = getBerlinDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildEventUrl(event) {
  return `${SITE_URL}/?event=${encodeURIComponent(event.id || event.file || event.title)}`;
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function getPublishedEvents() {
  const index = await readJson(INDEX_PATH, { events: [] });
  const entries = Array.isArray(index.events) ? index.events : [];

  const events = await Promise.all(entries.map(async entry => {
    const event = await readJson(path.join(EVENTS_ROOT, entry.file), null);
    if (!event?.date) {
      return null;
    }

    return {
      ...event,
      file: entry.file
    };
  }));

  return events
    .filter(Boolean)
    .sort((left, right) => `${left.date} ${left.start_time || "99:99"}`.localeCompare(`${right.date} ${right.start_time || "99:99"}`));
}

function groupEventsByDate(events) {
  const grouped = new Map();

  for (const event of events) {
    if (!grouped.has(event.date)) {
      grouped.set(event.date, []);
    }

    grouped.get(event.date).push(event);
  }

  return [...grouped.entries()].map(([date, dayEvents]) => ({
    date,
    label: formatDateInBerlin(new Date(`${date}T12:00:00Z`), {
      weekday: "long",
      day: "2-digit",
      month: "2-digit"
    }),
    events: dayEvents
  }));
}

function buildFeedEventTitle(event) {
  return event.status === "cancelled" ? `${event.title} (ABGESAGT)` : event.title;
}

function createSummary(groups, startDate, endDate) {
  const totalEvents = groups.reduce((sum, group) => sum + group.events.length, 0);
  const startLabel = formatDateInBerlin(new Date(`${startDate}T12:00:00Z`), {
    day: "2-digit",
    month: "2-digit"
  });
  const endLabel = formatDateInBerlin(new Date(`${endDate}T12:00:00Z`), {
    day: "2-digit",
    month: "2-digit"
  });

  if (totalEvents === 0) {
    return {
      title: `Wochenvorschau ${startLabel} bis ${endLabel}: keine geplanten Events`,
      intro: `Für den Zeitraum ${startLabel} bis ${endLabel} sind aktuell keine Events im Kalender eingetragen.`,
      lines: []
    };
  }

  const dayCount = groups.length;
  const lines = groups.map(group => `${group.label}:\n${group.events.map(event => {
    const parts = [
      event.start_time ? `${event.start_time} Uhr` : "Uhrzeit offen",
      buildFeedEventTitle(event),
      event.venue ? `in ${event.venue}` : null,
      event.server ? `Server: ${event.server}` : null,
      event.host ? `Host: ${event.host}` : null
    ].filter(Boolean);

    return `- ${parts.join(" | ")}`;
  }).join("\n")}`);

  return {
    title: `Wochenvorschau ${startLabel} bis ${endLabel}: ${totalEvents} Event${totalEvents === 1 ? "" : "s"} an ${dayCount} Tag${dayCount === 1 ? "" : "en"}`,
    intro: "Das ist die ruhige Wochenübersicht für die kommenden sieben Tage im Light Hotspots Kalender.",
    lines
  };
}

function createRssFeed({ generatedAt, summary, startDate }) {
  const pubDate = new Date(generatedAt).toUTCString();
  const description = [summary.intro, ...summary.lines].filter(Boolean).join("\n\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Light Hotspots Wochenfeed</title>
    <link>${SITE_URL}/</link>
    <description>Tägliche Wochenzusammenfassung der geplanten RP-Events für die kommenden sieben Tage.</description>
    <language>de-DE</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <ttl>1440</ttl>
    <item>
      <title>${escapeXml(summary.title)}</title>
      <link>${SITE_URL}/</link>
      <guid isPermaLink="false">${escapeXml(`${SITE_URL}/feeds/weekly-summary/${startDate}`)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description).replace(/\n/g, "&#10;")}</description>
    </item>
  </channel>
</rss>
`;
}

function createJsonFeed({ generatedAt, summary, groups, startDate, endDate }) {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: "Light Hotspots Wochenfeed",
    home_page_url: `${SITE_URL}/`,
    feed_url: `${SITE_URL}/feeds/weekly-summary.json`,
    description: "Tägliche Wochenzusammenfassung der geplanten RP-Events für die kommenden sieben Tage.",
    language: "de-DE",
    generated_at: generatedAt,
    weekly_window: {
      start_date: startDate,
      end_date: endDate
    },
    summary: {
      title: summary.title,
      intro: summary.intro,
      sections: summary.lines
    },
    items: groups.flatMap(group =>
      group.events.map(event => ({
        id: `${startDate}:${event.id || event.file || event.title}`,
        url: buildEventUrl(event),
        title: buildFeedEventTitle(event),
        content_text: [
          group.label,
          event.start_time ? `Start: ${event.start_time} Uhr` : "Start: offen",
          event.venue ? `Venue: ${event.venue}` : null,
          event.server ? `Server: ${event.server}` : null,
          event.status === "cancelled" ? "Status: Abgesagt" : null,
          event.host ? `Host: ${event.host}` : null,
          event.description || null
        ].filter(Boolean).join("\n"),
        date_published: generatedAt,
        tags: [event.type || "event", event.venue || "venue"].filter(Boolean)
      }))
    )
  };
}

function createDiscordMessages({ summary, groups, startDate, endDate }) {
  const startLabel = formatDateInBerlin(new Date(`${startDate}T12:00:00Z`), {
    day: "2-digit",
    month: "2-digit"
  });
  const endLabel = formatDateInBerlin(new Date(`${endDate}T12:00:00Z`), {
    day: "2-digit",
    month: "2-digit"
  });

  const messages = [
    `## Light Hotspots Wochenvorschau\n${summary.intro}\n\nZeitraum: **${startLabel} bis ${endLabel}**\nFeed: ${FEED_URL}`
  ];

  if (groups.length === 0) {
    messages[0] += "\n\nAktuell sind keine Events geplant.";
    return messages;
  }

  for (const group of groups) {
    const block = [
      `### ${group.label}`,
      ...group.events.map(event => {
        const parts = [
          event.start_time ? `${event.start_time} Uhr` : "Uhrzeit offen",
          `**${buildFeedEventTitle(event)}**`,
          event.venue ? `in ${event.venue}` : null,
          event.server ? `Server: ${event.server}` : null,
          event.host ? `Host: ${event.host}` : null
        ].filter(Boolean);

        return `- ${parts.join(" | ")}`;
      })
    ].join("\n");

    const current = messages[messages.length - 1];
    if (`${current}\n\n${block}`.length > DISCORD_LIMIT) {
      messages.push(block);
    } else {
      messages[messages.length - 1] = `${current}\n\n${block}`;
    }
  }

  return messages;
}

export function shouldRunCalendarFeedNow(date = new Date()) {
  return getBerlinDateParts(date).hour === 4;
}

export async function buildWeeklyCalendarDigest(referenceDate = new Date()) {
  const startDate = getBerlinDateKey(referenceDate);
  const endDate = addDays(startDate, 6);
  const events = await getPublishedEvents();
  const weeklyEvents = events.filter(event => event.date >= startDate && event.date <= endDate);
  const groups = groupEventsByDate(weeklyEvents);
  const summary = createSummary(groups, startDate, endDate);
  const generatedAt = referenceDate.toISOString();

  return {
    generatedAt,
    startDate,
    endDate,
    groups,
    summary,
    rssXml: createRssFeed({ generatedAt, summary, startDate }),
    jsonFeed: createJsonFeed({ generatedAt, summary, groups, startDate, endDate }),
    discordMessages: createDiscordMessages({ summary, groups, startDate, endDate })
  };
}

export async function writeWeeklyCalendarFeedFiles(referenceDate = new Date()) {
  const digest = await buildWeeklyCalendarDigest(referenceDate);

  await fs.mkdir(FEED_DIR, { recursive: true });
  await fs.writeFile(RSS_PATH, digest.rssXml, "utf-8");
  await writeJson(JSON_PATH, digest.jsonFeed);

  return digest;
}

export async function writeAndSyncWeeklyCalendarFeedFiles(referenceDate = new Date()) {
  const digest = await writeWeeklyCalendarFeedFiles(referenceDate);
  const syncResult = await syncRepoFiles(
    [RSS_PATH, JSON_PATH],
    `Update weekly feed ${digest.startDate}`
  );

  return {
    ...digest,
    syncResult
  };
}

async function readFeedState() {
  return readJson(PRIVATE_STATE_PATH, { last_posted_on: null });
}

async function writeFeedState(state) {
  await writeJson(PRIVATE_STATE_PATH, state);
}

export async function postWeeklyCalendarFeedIfDue(client, referenceDate = new Date()) {
  if (!shouldRunCalendarFeedNow(referenceDate)) {
    return { posted: false, reason: "not_due" };
  }

  const todayKey = getBerlinDateKey(referenceDate);
  const state = await readFeedState();
  if (state.last_posted_on === todayKey) {
    return { posted: false, reason: "already_posted" };
  }

  const channel = await client.channels.fetch(CHANNELS.CALENDAR_FEED);
  if (!channel?.isTextBased()) {
    return { posted: false, reason: "channel_unavailable" };
  }

  const digest = await buildWeeklyCalendarDigest(referenceDate);

  for (const message of digest.discordMessages) {
    await channel.send(message);
  }

  await writeFeedState({
    last_posted_on: todayKey,
    last_window_start: digest.startDate,
    last_window_end: digest.endDate,
    last_generated_at: digest.generatedAt
  });

  return {
    posted: true,
    messageCount: digest.discordMessages.length,
    startDate: digest.startDate,
    endDate: digest.endDate
  };
}

export async function forcePostWeeklyCalendarFeed(client, referenceDate = new Date()) {
  const channel = await client.channels.fetch(CHANNELS.CALENDAR_FEED);
  if (!channel?.isTextBased()) {
    const error = new Error("Kalenderfeed-Channel nicht verfügbar.");
    error.code = "CALENDAR_FEED_CHANNEL_UNAVAILABLE";
    throw error;
  }

  const digest = await writeAndSyncWeeklyCalendarFeedFiles(referenceDate);

  for (const message of digest.discordMessages) {
    await channel.send(message);
  }

  await writeFeedState({
    last_posted_on: getBerlinDateKey(referenceDate),
    last_window_start: digest.startDate,
    last_window_end: digest.endDate,
    last_generated_at: digest.generatedAt,
    last_forced_at: referenceDate.toISOString()
  });

  return {
    posted: true,
    messageCount: digest.discordMessages.length,
    startDate: digest.startDate,
    endDate: digest.endDate,
    syncResult: digest.syncResult
  };
}

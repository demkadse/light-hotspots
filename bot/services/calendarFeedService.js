import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { EmbedBuilder } from "discord.js";

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
const PLACEHOLDER_IMAGE_URL = `${SITE_URL}/placeholder.png`;
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

function getEventImageUrl(event) {
  const rawImage = typeof event?.image === "string" ? event.image.trim() : "";

  if (!rawImage) {
    return PLACEHOLDER_IMAGE_URL;
  }

  if (/^https?:\/\//i.test(rawImage)) {
    return rawImage;
  }

  const normalizedPath = rawImage.startsWith("/") ? rawImage : `/${rawImage}`;
  return `${SITE_URL}${normalizedPath}`;
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

function getFeedAccent(event) {
  if (event.status === "cancelled") {
    return "Rot";
  }

  const type = (event.type || event.event_type || "").toLowerCase();

  if (type.includes("taverne")) return "Gold";
  if (type.includes("markt")) return "Kupfer";
  if (type.includes("club")) return "Magenta";
  if (type.includes("open")) return "Blau";
  if (type.includes("salon")) return "Rosa";
  return "Blau";
}

function formatFeedTime(event) {
  if (event.start_time && event.end_time) {
    return `${event.start_time}-${event.end_time}`;
  }

  if (event.start_time) {
    return `${event.start_time}`;
  }

  if (event.end_time) {
    return `bis ${event.end_time}`;
  }

  return "offen";
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
      intro: `F\u00fcr den Zeitraum ${startLabel} bis ${endLabel} sind aktuell keine Events im Kalender eingetragen.`,
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
    intro: "Das ist die ruhige Wochen\u00fcbersicht f\u00fcr die kommenden sieben Tage im Light Hotspots Kalender.",
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
    <description>T\u00e4gliche Wochenzusammenfassung der geplanten RP-Events f\u00fcr die kommenden sieben Tage.</description>
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
    description: "T\u00e4gliche Wochenzusammenfassung der geplanten RP-Events f\u00fcr die kommenden sieben Tage.",
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
        image: getEventImageUrl(event),
        content_text: [
          group.label,
          event.start_time ? `Start: ${event.start_time} Uhr` : "Start: offen",
          event.venue ? `Venue: ${event.venue}` : null,
          event.server ? `Server: ${event.server}` : null,
          event.status === "cancelled" ? "Status: Abgesagt" : null,
          event.host ? `Host: ${event.host}` : null,
          event.notes ? `Hinweise: ${event.notes}` : null,
          event.description || null
        ].filter(Boolean).join("\n"),
        date_published: generatedAt,
        tags: [event.type || "event", event.venue || "venue"].filter(Boolean)
      }))
    )
  };
}

function chunkEmbeds(embeds, size = 10) {
  const chunks = [];

  for (let index = 0; index < embeds.length; index += size) {
    chunks.push(embeds.slice(index, index + size));
  }

  return chunks;
}

function clampText(value, maxLength) {
  if (!value) {
    return null;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function buildCompactWeekLines(groups) {
  return groups.flatMap(group => {
    const lines = [`**${group.label}**`];

    for (const event of group.events) {
      lines.push([
        `[${getFeedAccent(event)}]`,
        `\`${formatFeedTime(event)}\``,
        `**${buildFeedEventTitle(event)}**`,
        event.venue ? `in ${event.venue}` : null
      ].filter(Boolean).join(" "));
    }

    return lines;
  });
}

function buildEventFacts(event, groupLabel) {
  return [
    `**Tag:** ${groupLabel}`,
    `**Zeit:** ${formatFeedTime(event)}`,
    event.type || event.event_type ? `**Typ:** ${event.type || event.event_type}` : null,
    event.venue ? `**Venue:** ${event.venue}` : null,
    event.server ? `**Server:** ${event.server}` : null,
    event.host ? `**Veranstalter:** ${event.host}` : null,
    event.venue_lead ? `**Venue-Leitung:** ${event.venue_lead}` : null,
    event.status === "cancelled" ? "**Status:** Abgesagt" : null,
    event.notes ? `**Hinweise:** ${event.notes}` : null
  ].filter(Boolean).join("\n");
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

  const title = `Light Hotspots Wochenvorschau | ${startLabel} bis ${endLabel}`;
  const baseEmbed = new EmbedBuilder()
    .setColor(0xf3ba6c)
    .setTitle(title)
    .setURL(FEED_URL)
    .setDescription(summary.intro)
    .setFooter({ text: "Light Hotspots Kalender" });

  if (groups.length === 0) {
    return [{
      embeds: [
        baseEmbed
          .addFields({
            name: "Zeitraum",
            value: `${startLabel} bis ${endLabel}`
          })
          .addFields({
            name: "Diese Woche",
            value: "Aktuell sind keine Events geplant."
          })
          .setTimestamp(new Date())
      ]
    }];
  }

  const overviewLines = buildCompactWeekLines(groups);
  const overviewChunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const line of overviewLines) {
    const lineLength = line.length + 1;

    if (currentChunk.length > 0 && currentLength + lineLength > 900) {
      overviewChunks.push(currentChunk.join("\n"));
      currentChunk = [];
      currentLength = 0;
    }

    currentChunk.push(line);
    currentLength += lineLength;
  }

  if (currentChunk.length > 0) {
    overviewChunks.push(currentChunk.join("\n"));
  }

  const overviewEmbed = baseEmbed
    .addFields({
      name: "Zeitraum",
      value: `${startLabel} bis ${endLabel}`,
      inline: false
    })
    .addFields({
      name: "Uebersicht",
      value: `${summary.title}\n${groups.length} Tag${groups.length === 1 ? "" : "e"} mit geplanten Eintr\u00e4gen.`,
      inline: false
    })
    .setTimestamp(new Date());

  overviewChunks.forEach((chunk, index) => {
    overviewEmbed.addFields({
      name: index === 0 ? "Alle Events auf einen Blick" : "\u200b",
      value: chunk,
      inline: false
    });
  });

  const eventEmbeds = groups.flatMap(group =>
    group.events.map(event => {
      const embed = new EmbedBuilder()
        .setColor(event.status === "cancelled" ? 0xc75c5c : 0x5ea8d6)
        .setTitle(buildFeedEventTitle(event))
        .setURL(buildEventUrl(event))
        .setDescription(clampText(event.description || "Keine Beschreibung vorhanden.", 4096))
        .setImage(getEventImageUrl(event))
        .setFooter({ text: `Light Hotspots Kalender | ${group.label}` });

      const facts = clampText(buildEventFacts(event, group.label), 1024);
      if (facts) {
        embed.addFields({
          name: "Infos",
          value: facts,
          inline: false
        });
      }

      const links = [
        event.discord_link ? `[Discord](${event.discord_link})` : null,
        event.link ? `[Externer Link](${event.link})` : null,
        Array.isArray(event.links)
          ? event.links
            .filter(link => link && link !== event.discord_link && link !== event.link)
            .map((link, index) => `[Link ${index + 1}](${link})`)
            .join(" | ")
          : null
      ].filter(Boolean).join(" | ");

      if (links) {
        embed.addFields({
          name: "Links",
          value: clampText(links, 1024),
          inline: false
        });
      }

      return embed;
    })
  );

  const allEmbeds = [overviewEmbed, ...eventEmbeds];
  return chunkEmbeds(allEmbeds).map(embeds => ({ embeds }));
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

  try {
    for (const message of digest.discordMessages) {
      await channel.send(message);
    }
  } catch (error) {
    if (error?.code === 50013) {
      return { posted: false, reason: "missing_permissions" };
    }

    throw error;
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
    const error = new Error("Kalenderfeed-Channel nicht verf\u00fcgbar.");
    error.code = "CALENDAR_FEED_CHANNEL_UNAVAILABLE";
    throw error;
  }

  const digest = await writeAndSyncWeeklyCalendarFeedFiles(referenceDate);

  try {
    for (const message of digest.discordMessages) {
      await channel.send(message);
    }
  } catch (error) {
    if (error?.code === 50013) {
      const wrappedError = new Error("Der Bot darf im Kalenderfeed-Channel keine Nachrichten senden.");
      wrappedError.code = "CALENDAR_FEED_MISSING_PERMISSIONS";
      wrappedError.digest = digest;
      throw wrappedError;
    }

    throw error;
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

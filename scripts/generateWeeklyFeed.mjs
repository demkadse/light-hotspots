import { shouldRunCalendarFeedNow, writeWeeklyCalendarFeedFiles } from "../bot/services/calendarFeedService.js";

if (process.env.FORCE_FEED_BUILD !== "true" && !shouldRunCalendarFeedNow()) {
  console.log("Skipped feed generation because it is not 04:00 in Europe/Berlin.");
  process.exit(0);
}

const digest = await writeWeeklyCalendarFeedFiles();
console.log(`Generated weekly feed for ${digest.startDate} to ${digest.endDate}`);

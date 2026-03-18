import { createEvent } from "../services/eventService.js";
import { logEvent } from "../services/logService.js";
import { logToDiscord } from "../services/logService.js";
import { CHANNELS } from "../config/channels.js";

export async function handleModal(interaction, client) {

  if (interaction.customId !== "event_modal") return;

  const title = interaction.fields.getTextInputValue("title");
  const venue = interaction.fields.getTextInputValue("venue");
  const date = interaction.fields.getTextInputValue("date");
  const time = interaction.fields.getTextInputValue("time");
  const description = interaction.fields.getTextInputValue("description");

  const event = {
    id: `${venue}-${date}`,
    title,
    venue,
    date,
    start_time: time,
    description,
    created_by: interaction.user.id,
    created_at: new Date().toISOString()
  };

  try {

    await createEvent(event);

    // GitHub Log
    await logEvent({
      type: "event_created",
      event_id: event.id,
      user_id: interaction.user.id,
      timestamp: new Date().toISOString(),
      data: event
    });

    // Discord Log
    await logToDiscord(
      client,
      CHANNELS.EVENT_LOG,
      `📅 Event erstellt: **${title}** (${date} ${time})`
    );

    await interaction.reply({
      content: "✅ Event erfolgreich erstellt!",
      ephemeral: true
    });

  } catch (error) {

    await logToDiscord(
      client,
      CHANNELS.ERROR_LOG,
      `❌ Fehler: ${error.message}`
    );

    await interaction.reply({
      content: "❌ Fehler beim Erstellen des Events.",
      ephemeral: true
    });
  }
}

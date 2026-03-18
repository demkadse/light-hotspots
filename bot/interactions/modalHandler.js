import { createEvent } from "../services/eventService.js";
import { logEvent, logToDiscord } from "../services/logService.js";
import { CHANNELS } from "../config/channels.js";

export async function handleModal(interaction, client) {

  if (!interaction.customId.startsWith("event_modal_")) return;

  try {

    const title = interaction.fields.getTextInputValue("title").trim();
    const venue = interaction.fields.getTextInputValue("venue").trim();
    const date = interaction.fields.getTextInputValue("date").trim();
    const time = interaction.fields.getTextInputValue("time").trim();
    const description = interaction.fields.getTextInputValue("description").trim();

    const event = {
      title,
      venue,
      date,
      start_time: time,
      description,
      created_by: interaction.user.id,
      created_at: new Date().toISOString()
    };

    const created = await createEvent(event);

    await logEvent({
      type: "event_created",
      event_id: created.id,
      user_id: interaction.user.id,
      timestamp: new Date().toISOString(),
      data: created
    });

    await logToDiscord(
      client,
      CHANNELS.EVENT_LOG,
      `📅 Event erstellt: **${created.title}** (${created.date} ${created.start_time})`
    );

    await interaction.reply({
      content: "✅ Event erfolgreich erstellt!",
      flags: 64
    });

  } catch (error) {

    console.error("Modal Fehler:", error);

    await logToDiscord(
      client,
      CHANNELS.ERROR_LOG,
      `❌ Fehler: ${error.message}`
    );

    await interaction.reply({
      content: `❌ ${error.message}`,
      flags: 64
    });

  }

}
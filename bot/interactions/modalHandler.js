import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { createOrUpdateTemplate } from "../services/templateService.js";
import { CHANNELS } from "../config/channels.js";

export async function handleModal(interaction, client) {
  if (!interaction.customId.startsWith("event_modal_")) return;

  try {

    const title = interaction.fields.getTextInputValue("title");
    const venue = interaction.fields.getTextInputValue("venue");
    const date = interaction.fields.getTextInputValue("date");
    const time = interaction.fields.getTextInputValue("time");
    const description = interaction.fields.getTextInputValue("description");
    const image = interaction.fields.getTextInputValue("image") || null;

    const template = await createOrUpdateTemplate({
      title,
      venue,
      date,
      time,
      description,
      image
    }, interaction.user.id);

    // ✅ DM (mit Logging)
    try {
      await interaction.user.send(
        "📨 Dein Event wurde eingereicht!\n\nBitte warte, bis ein Administrator es geprüft hat."
      );
    } catch (err) {
      console.warn("DM konnte nicht gesendet werden:", err.message);
    }

    // ✅ Channel holen + prüfen
    const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

    if (!channel) {
      throw new Error("Approval Channel nicht gefunden");
    }

    // ✅ Buttons sauber gebaut (kein raw API mehr)
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:approve:${template.id}`)
        .setLabel("Annehmen")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`event:reject:${template.id}`)
        .setLabel("Ablehnen")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `📦 Neues Template von <@${interaction.user.id}>`,
      components: [row]
    });

    await interaction.reply({
      content: "✅ Eingereicht und wartet auf Prüfung.",
      ephemeral: true
    });

  } catch (err) {
    console.error("Modal Error:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Fehler beim Einreichen.",
        ephemeral: true
      });
    }
  }
}
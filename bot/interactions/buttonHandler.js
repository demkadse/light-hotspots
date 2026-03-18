import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";

export async function handleButton(interaction) {
  const id = interaction.customId;

  try {

    // ✅ EVENT ERSTELLEN → Modal öffnen
    if (id === "event:create") {

      const modal = new ModalBuilder()
        .setCustomId("event_modal_create")
        .setTitle("Event erstellen");

      const titleInput = new TextInputBuilder()
        .setCustomId("title")
        .setLabel("Titel")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const venueInput = new TextInputBuilder()
        .setCustomId("venue")
        .setLabel("Location / Venue")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const dateInput = new TextInputBuilder()
        .setCustomId("date")
        .setLabel("Datum (z.B. 20.03.2026)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const timeInput = new TextInputBuilder()
        .setCustomId("time")
        .setLabel("Uhrzeit")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const descriptionInput = new TextInputBuilder()
        .setCustomId("description")
        .setLabel("Beschreibung")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const imageInput = new TextInputBuilder()
        .setCustomId("image")
        .setLabel("Bild URL (optional)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(venueInput),
        new ActionRowBuilder().addComponents(dateInput),
        new ActionRowBuilder().addComponents(timeInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(imageInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // (approve / reject kommt später sauber rein)

  } catch (err) {
    console.error("Button Error:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Fehler beim Button.",
        ephemeral: true
      });
    }
  }
}
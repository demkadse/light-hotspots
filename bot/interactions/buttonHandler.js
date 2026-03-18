import {
  ActionRowBuilder,
  StringSelectMenuBuilder
} from "discord.js";

import { getTemplates } from "../services/templateService.js";
import { CHANNELS } from "../config/channels.js";

export async function handleButton(interaction) {

  if (interaction.customId !== "create_event") return;

  try {

    // Sicherheitscheck: nur im Event-Channel erlaubt
    if (CHANNELS.EVENT_CHANNEL && interaction.channelId !== CHANNELS.EVENT_CHANNEL) {
      return await interaction.reply({
        content: "❌ Dieser Button kann nur im Event-Channel genutzt werden.",
        flags: 64
      });
    }

    // Defer für bessere UX (verhindert Timeout)
    await interaction.deferReply({ flags: 64 });

    const templates = await getTemplates();

    // Fallback wenn keine Templates existieren
    if (!templates || templates.length === 0) {

      const select = new StringSelectMenuBuilder()
        .setCustomId("template_select")
        .setPlaceholder("Template auswählen")
        .addOptions([
          {
            label: "➕ Neues Template erstellen",
            value: "new_template"
          }
        ]);

      const row = new ActionRowBuilder().addComponents(select);

      return await interaction.editReply({
        content: "Es existieren noch keine Templates. Erstelle dein erstes:",
        components: [row]
      });
    }

    // Templates limitieren (Discord Limit: 25)
    const options = templates.slice(0, 24).map(t => ({
      label: t.title?.substring(0, 100) || "Unbenannt",
      value: t.id
    }));

    // Option für neues Template
    options.unshift({
      label: "➕ Neues Template erstellen",
      value: "new_template"
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId("template_select")
      .setPlaceholder("Template auswählen")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.editReply({
      content: "Wähle ein Template oder erstelle ein neues:",
      components: [row]
    });

  } catch (error) {

    console.error("Button Handler Fehler:", error);

    if (interaction.deferred) {
      await interaction.editReply({
        content: "❌ Fehler beim Laden der Templates.",
        components: []
      });
    } else {
      await interaction.reply({
        content: "❌ Fehler beim Laden der Templates.",
        flags: 64
      });
    }

  }

}
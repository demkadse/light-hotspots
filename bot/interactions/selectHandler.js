import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import {
  buildVenueLabel,
  normalizeRecurrence,
  parseVenueSelection
} from "../config/eventFormOptions.js";
import {
  createOrUpdateTemplate,
  findPotentialDuplicates,
  getTemplate
} from "../services/templateService.js";
import {
  deferEphemeral,
  replyAndExpire
} from "../services/interactionResponseService.js";
import { assertAdminUser } from "../services/permissionService.js";
import {
  buildBasicsModal,
  buildPreviewEmbed,
  buildWizardComponents,
  buildWizardMessage,
  normalizeOptionalField,
  shouldResetTypeForCategory
} from "../services/eventWizardUiService.js";
import { recordAuditEntry } from "../services/auditService.js";

async function replyWithWizardPreview(interaction, template, client, auditAction, message = null) {
  const duplicates = await findPotentialDuplicates(template);

  await recordAuditEntry(client, {
    action: auditAction,
    actor_id: interaction.user.id,
    target_id: template.id,
    summary: template.title || "Unbenannt"
  });

  await replyAndExpire(interaction, {
    content: message || buildWizardMessage(template),
    embeds: [buildPreviewEmbed(template, duplicates)],
    components: buildWizardComponents(template),
    ephemeral: true
  }, 120000);
}

function buildHousingUpdate(customId, value, template) {
  const existingDistrict = normalizeOptionalField(template?.housing_district) || parseVenueSelection(template?.venue).district;
  const existingPlot = normalizeOptionalField(template?.housing_plot) || parseVenueSelection(template?.venue).plot;

  const district = customId.startsWith("event:district:") ? value : existingDistrict;
  const plot = customId.startsWith("event:house:") ? value : existingPlot;

  return {
    data: {
      housing_district: district,
      housing_plot: plot,
      venue: buildVenueLabel(district, plot)
    },
    message: customId.startsWith("event:district:")
      ? "Wohngebiet gespeichert."
      : "Hausnummer gespeichert."
  };
}

function buildSelectionUpdate(customId, value, template) {
  if (customId.startsWith("event:district:") || customId.startsWith("event:house:")) {
    return buildHousingUpdate(customId, value, template);
  }

  if (customId.startsWith("event:type:")) {
    return {
      data: { event_type: value },
      message: "Typ gespeichert."
    };
  }

  if (customId.startsWith("event:server:")) {
    return {
      data: { server: value },
      message: "Server gespeichert."
    };
  }

  if (customId.startsWith("event:recurrence:")) {
    return {
      data: { recurrence_rule: normalizeRecurrence(value) },
      message: "Wiederholung gespeichert."
    };
  }

  if (customId.startsWith("event:category:")) {
    const update = {
      category: value
    };

    if (shouldResetTypeForCategory(template?.event_type || template?.type, value)) {
      update.event_type = null;
    }

    return {
      data: update,
      message: "Kategorie gespeichert. Bitte pruefe jetzt den Typ, damit er zur gewaehlten Kategorie passt."
    };
  }

  return null;
}

export async function handleSelect(interaction, client) {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "event:selectCancellationTemplate") {
    await deferEphemeral(interaction);
    const templateId = interaction.values[0];
    const template = await getTemplate(templateId);

    if (!template) {
      await replyAndExpire(interaction, {
        content: "Das ausgewaehlte Event wurde nicht gefunden.",
        ephemeral: true
      });
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:cancel_confirm:${template.id}`)
        .setLabel("Ja, Event absagen")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("event:cancel_abort")
        .setLabel("Abbrechen")
        .setStyle(ButtonStyle.Secondary)
    );

    await replyAndExpire(interaction, {
      content: `Ausgewaehlt: ${template.title} (${template.date}). Das Event bleibt sichtbar, wird aber als abgesagt markiert.`,
      components: [row],
      ephemeral: true
    }, 120000);
    return;
  }

  if (interaction.customId === "admin:selectUnpublishEvent") {
    assertAdminUser(interaction);
    await deferEphemeral(interaction);

    const templateId = interaction.values[0];
    const template = await getTemplate(templateId);

    if (!template) {
      await replyAndExpire(interaction, {
        content: "Das ausgewaehlte Event wurde nicht gefunden.",
        ephemeral: true
      });
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:unpublish:${template.id}`)
        .setLabel("Veroeffentlichung zuruecknehmen")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("event:unpublish_cancel:selection")
        .setLabel("Abbrechen")
        .setStyle(ButtonStyle.Secondary)
    );

    await replyAndExpire(interaction, {
      content: `Ausgewaehlt: ${template.title} (${template.date})`,
      components: [row],
      ephemeral: true
    }, 120000);
    return;
  }

  if (interaction.customId === "event:selectTemplate") {
    const value = interaction.values[0];
    const template = await getTemplate(value);
    await interaction.showModal(buildBasicsModal(template, `event_modal_basics_${value}`));
    return;
  }

  const templateId = interaction.customId.split(":")[2];
  const selectionValue = normalizeOptionalField(interaction.values[0]);
  await deferEphemeral(interaction);

  const currentTemplate = await getTemplate(templateId);
  const update = buildSelectionUpdate(interaction.customId, selectionValue, currentTemplate);

  if (!update) {
    return;
  }

  const nextTemplate = await createOrUpdateTemplate(update.data, interaction.user.id, templateId);
  await replyWithWizardPreview(interaction, nextTemplate, client, "template.selection_updated", update.message);
}

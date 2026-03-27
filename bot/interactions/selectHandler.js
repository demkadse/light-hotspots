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
  return replyWithWizardPreviewWithOptions(interaction, template, client, auditAction, message);
}

async function replyWithWizardPreviewWithOptions(interaction, template, client, auditAction, message = null, options = {}) {
  const duplicates = await findPotentialDuplicates(template);

  await recordAuditEntry(client, {
    action: auditAction,
    actor_id: interaction.user.id,
    target_id: template.id,
    summary: template.title || "Unbenannt"
  });

  await replyAndExpire(interaction, {
    content: message || buildWizardMessage(template, options),
    embeds: [buildPreviewEmbed(template, duplicates)],
    components: buildWizardComponents(template, options),
    ephemeral: true
  }, null);
}

function buildHousingUpdate(customId, value, template) {
  const existingDistrict = normalizeOptionalField(template?.housing_district) || parseVenueSelection(template?.venue).district;
  const existingWard = normalizeOptionalField(template?.housing_ward) || parseVenueSelection(template?.venue).ward;
  const existingPlot = normalizeOptionalField(template?.housing_plot) || parseVenueSelection(template?.venue).plot;

  const district = customId.startsWith("event:district:") ? value : existingDistrict;
  const ward = customId.startsWith("event:ward:") ? value : existingWard;
  const plot = customId.startsWith("event:house:") ? value : existingPlot;

  return {
    data: {
      housing_district: district,
      housing_ward: ward,
      housing_plot: plot,
      venue: buildVenueLabel(district, ward, plot)
    },
    message: customId.startsWith("event:district:")
      ? "Wohngebiet gespeichert."
      : customId.startsWith("event:ward:")
        ? "Bezirk gespeichert."
      : "Hausnummer gespeichert."
  };
}

function buildSelectionUpdate(customId, value, template) {
  if (customId.startsWith("event:district:") || customId.startsWith("event:ward:") || customId.startsWith("event:house:")) {
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

    if (!template) {
      await replyAndExpire(interaction, {
        content: "Das ausgewaehlte Event wurde nicht gefunden.",
        ephemeral: true
      });
      return;
    }

    await deferEphemeral(interaction);
    await replyWithWizardPreview(
      interaction,
      template,
      client,
      "template.opened",
      "Event geladen. Du kannst jetzt Basisdaten, Dropdown-Angaben oder Zusatzangaben gezielt bearbeiten."
    );
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
  const mode = (
    interaction.customId.startsWith("event:type:") || interaction.customId.startsWith("event:server:")
  ) ? "details" : "address";
  await replyWithWizardPreviewWithOptions(
    interaction,
    nextTemplate,
    client,
    "template.selection_updated",
    update.message,
    { mode }
  );
}

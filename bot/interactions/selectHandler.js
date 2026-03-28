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
  buildFlowConfirmation,
  buildPreviewEmbed,
  buildWizardComponents,
  buildWizardMessage,
  normalizeOptionalField,
  shouldResetTypeForCategory
} from "../services/eventWizardUiService.js";
import { getTemplateEditorIds, getTemplateOwnerId, isTemplateOwner } from "../services/identityService.js";
import { recordAuditEntry } from "../services/auditService.js";

const EVENT_FLOW_EXPIRY_MS = 10 * 60 * 1000;

async function sendEditorAssignmentDm(client, userId, template, actorId) {
  if (!userId || userId === actorId) {
    return false;
  }

  try {
    const user = await client.users.fetch(userId);
    await user.send([
      "Du wurdest als Mitbearbeiter fuer ein Event eingetragen.",
      "",
      `Titel: ${template?.title || "Unbenannt"}`,
      template?.date ? `Datum: ${template.date}` : null,
      template?.time ? `Zeit: ${template.time}` : null,
      "Du kannst das Template jetzt im Bot ueber `Bestehendes Event bearbeiten` mit bearbeiten."
    ].filter(Boolean).join("\n"));
    return true;
  } catch (error) {
    console.warn("Mitbearbeiter-DM fehlgeschlagen:", error.message);
    return false;
  }
}

async function replyWithWizardPreview(interaction, template, client, auditAction, message = null) {
  return replyWithWizardPreviewWithOptions(interaction, template, client, auditAction, message);
}

async function replyWithWizardPreviewWithOptions(interaction, template, client, auditAction, message = null, options = {}) {
  const editorIds = await getTemplateEditorIds(template);
  const displayTemplate = {
    ...template,
    editor_ids_for_display: editorIds,
    editor_mentions_for_display: editorIds.map(userId => `<@${userId}>`)
  };
  const duplicates = await findPotentialDuplicates(template);

  await recordAuditEntry(client, {
    action: auditAction,
    actor_id: interaction.user.id,
    target_id: template.id,
    summary: template.title || "Unbenannt"
  });

  await replyAndExpire(interaction, {
    content: message || buildWizardMessage(displayTemplate, options),
    embeds: [buildPreviewEmbed(displayTemplate, duplicates)],
    components: buildWizardComponents(displayTemplate, options),
    ephemeral: true
  }, EVENT_FLOW_EXPIRY_MS);
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
    confirmation: {
      action: "address_saved",
      label: customId.startsWith("event:district:")
        ? "Wohngebiet"
        : customId.startsWith("event:ward:")
          ? "Bezirk"
          : "Hausnummer",
      value
    },
    mode: "address"
  };
}

function buildSelectionUpdate(customId, value, template) {
  if (customId.startsWith("event:district:") || customId.startsWith("event:ward:") || customId.startsWith("event:house:")) {
    return buildHousingUpdate(customId, value, template);
  }

  if (customId.startsWith("event:type:")) {
    return {
      data: { event_type: value },
      confirmation: { action: "detail_saved", label: "Typ", value },
      mode: "details"
    };
  }

  if (customId.startsWith("event:server:")) {
    return {
      data: { server: value },
      confirmation: { action: "detail_saved", label: "Server", value },
      mode: "details"
    };
  }

  if (customId.startsWith("event:recurrence:")) {
    return {
      data: { recurrence_rule: normalizeRecurrence(value) },
      confirmation: { action: "detail_saved", label: "Wiederholung", value },
      mode: "details"
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
      confirmation: {
        action: "detail_saved",
        label: "Kategorie",
        value: shouldResetTypeForCategory(template?.event_type || template?.type, value)
          ? `${value} (Typ bitte neu pruefen)`
          : value
      },
      mode: "details"
    };
  }

  return null;
}

export async function handleSelect(interaction, client) {
  if (!interaction.isStringSelectMenu() && !interaction.isUserSelectMenu()) return;

  if (interaction.isUserSelectMenu() && interaction.customId.startsWith("event:editorsSelect:")) {
    await deferEphemeral(interaction);
    const templateId = interaction.customId.split(":")[2];
    const template = await getTemplate(templateId);

    if (!template) {
      await replyAndExpire(interaction, {
        content: "Das ausgewaehlte Event wurde nicht gefunden.",
        ephemeral: true
      }, 45000);
      return;
    }

    const ownerId = await getTemplateOwnerId(template);
    if (ownerId !== interaction.user.id && !(!ownerId && isTemplateOwner(template, interaction.user.id))) {
      await replyAndExpire(interaction, {
        content: "Nur der Urheber darf Mitbearbeiter aendern.",
        ephemeral: true
      }, 45000);
      return;
    }

    const previousEditorIds = await getTemplateEditorIds(template);
    const selectedUserIds = [...new Set(interaction.values)].slice(0, 2);
    const sanitizedUserIds = selectedUserIds.filter(userId => userId !== interaction.user.id);
    const updatedTemplate = await createOrUpdateTemplate({
      editor_user_ids: sanitizedUserIds
    }, interaction.user.id, templateId);

    const newlyAddedUserIds = sanitizedUserIds.filter(userId => !previousEditorIds.includes(userId));
    let notifiedCount = 0;
    for (const userId of newlyAddedUserIds) {
      if (await sendEditorAssignmentDm(client, userId, updatedTemplate, interaction.user.id)) {
        notifiedCount += 1;
      }
    }

    const updatedEditorIds = await getTemplateEditorIds(updatedTemplate);
    const displayTemplate = {
      ...updatedTemplate,
      editor_ids_for_display: updatedEditorIds,
      editor_mentions_for_display: updatedEditorIds.map(userId => `<@${userId}>`)
    };

    await replyWithWizardPreviewWithOptions(
      interaction,
      displayTemplate,
      client,
      "template.editors_updated",
      buildFlowConfirmation("editors_saved", displayTemplate, {
        ownerSkipped: sanitizedUserIds.length !== selectedUserIds.length,
        notifiedCount
      }),
      { mode: "editors" }
    );
    return;
  }

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
      `Event geladen: **${template.title || "Unbenannt"}**. Du kannst jetzt Basisdaten, Dropdown-Angaben, Zusatzangaben und Mitbearbeiter gezielt bearbeiten.`
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
  await replyWithWizardPreviewWithOptions(
    interaction,
    nextTemplate,
    client,
    "template.selection_updated",
    buildFlowConfirmation(update.confirmation.action, nextTemplate, update.confirmation),
    { mode: update.mode }
  );
}

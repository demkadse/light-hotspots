import {
  createOrUpdateTemplate,
  findPotentialDuplicates,
  findReusableTemplateDraft,
  getTemplate
} from "../services/templateService.js";
import {
  deferEphemeral,
  replyAndExpire
} from "../services/interactionResponseService.js";
import { validateEventInput } from "../validators/eventValidator.js";
import { recordAuditEntry } from "../services/auditService.js";
import {
  buildPreviewEmbed,
  buildWizardComponents,
  buildWizardMessage,
  normalizeOptionalField
} from "../services/eventWizardUiService.js";
import { getTemplateEditorIds, getTemplateOwnerId, isTemplateOwner, matchesUserHash } from "../services/identityService.js";

function parseEditorIds(rawValue) {
  const entries = String(rawValue || "")
    .split(/\r?\n/)
    .map(entry => entry.trim())
    .filter(Boolean);

  const invalidEntry = entries.find(entry => !/^\d{17,20}$/.test(entry));
  if (invalidEntry) {
    return { error: "Weitere Bearbeiter muessen gueltige Discord-User-IDs sein." };
  }

  const uniqueEntries = [...new Set(entries)];
  if (uniqueEntries.length > 2) {
    return { error: "Es duerfen maximal zwei weitere Bearbeiter hinterlegt werden." };
  }

  return { value: uniqueEntries };
}

function getTemplateIdFromModal(customId) {
  if (
    customId === "event_modal_basics_create" ||
    customId === "event_modal_basics_create_event" ||
    customId === "event_modal_basics_create_venue"
  ) {
    return null;
  }

  if (customId.startsWith("event_modal_basics_")) {
    return customId.replace("event_modal_basics_", "");
  }

  if (customId.startsWith("event_modal_extras_")) {
    return customId.replace("event_modal_extras_", "");
  }

  return null;
}

function getInitialCategoryFromModal(customId) {
  if (customId === "event_modal_basics_create_event") {
    return "event";
  }

  if (customId === "event_modal_basics_create_venue") {
    return "venue";
  }

  return null;
}

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
  }, null);
}

export async function handleModal(interaction, client) {
  if (interaction.customId === "event_modal_basics_create" || interaction.customId.startsWith("event_modal_basics_")) {
    await deferEphemeral(interaction);

    const data = {
      title: interaction.fields.getTextInputValue("title").trim(),
      date: interaction.fields.getTextInputValue("date").trim(),
      time: interaction.fields.getTextInputValue("time").trim(),
      description: interaction.fields.getTextInputValue("description").trim(),
      category: getInitialCategoryFromModal(interaction.customId),
      status: "draft"
    };

    let templateId = getTemplateIdFromModal(interaction.customId);

    const errors = validateEventInput(data);
    if (errors.length > 0) {
      await replyAndExpire(interaction, {
        content: errors.join("\n"),
        ephemeral: true
      }, 45000);
      return;
    }

    if (!templateId) {
      const reusableTemplate = await findReusableTemplateDraft(interaction.user.id, data);
      if (reusableTemplate) {
        templateId = reusableTemplate.id;
      }
    }

    const template = await createOrUpdateTemplate(data, interaction.user.id, templateId);
    await replyWithWizardPreview(
      interaction,
      template,
      client,
      templateId ? "template.updated" : "template.created",
      "Basisdaten gespeichert. Vervollständige jetzt im Schritt 2/3 die Adresse."
    );
    return;
  }

  if (interaction.customId.startsWith("event_modal_extras_")) {
    await deferEphemeral(interaction);

    const templateId = getTemplateIdFromModal(interaction.customId);
    const templateBeforeUpdate = await getTemplate(templateId);
    if (!templateBeforeUpdate || !matchesUserHash(templateBeforeUpdate, interaction.user.id)) {
      await replyAndExpire(interaction, {
        content: "Du darfst dieses Event nicht bearbeiten.",
        ephemeral: true
      }, 45000);
      return;
    }

    const linkLines = interaction.fields
      .getTextInputValue("links")
      .split(/\r?\n/)
      .map(entry => entry.trim())
      .filter(Boolean);
    const parsedEditors = parseEditorIds(interaction.fields.getTextInputValue("editor_ids"));
    if (parsedEditors.error) {
      await replyAndExpire(interaction, {
        content: parsedEditors.error,
        ephemeral: true
      }, 45000);
      return;
    }

    const ownerId = await getTemplateOwnerId(templateBeforeUpdate);
    const canManageEditors = ownerId === interaction.user.id || (!ownerId && isTemplateOwner(templateBeforeUpdate, interaction.user.id));
    const existingEditorIds = await getTemplateEditorIds(templateBeforeUpdate);
    const requestedEditorIds = parsedEditors.value || [];

    if ((ownerId && requestedEditorIds.includes(ownerId)) || (!ownerId && requestedEditorIds.includes(interaction.user.id))) {
      await replyAndExpire(interaction, {
        content: "Der Urheber muss nicht erneut als weiterer Bearbeiter eingetragen werden.",
        ephemeral: true
      }, 45000);
      return;
    }

    const editorIdsChanged = requestedEditorIds.length !== existingEditorIds.length ||
      requestedEditorIds.some((value, index) => value !== existingEditorIds[index]);

    if (editorIdsChanged && !canManageEditors) {
      await replyAndExpire(interaction, {
        content: "Nur der Urheber darf die Liste der weiteren Bearbeiter aendern.",
        ephemeral: true
      }, 45000);
      return;
    }

    const data = {
      end_time: normalizeOptionalField(interaction.fields.getTextInputValue("end_time")),
      project_lead: normalizeOptionalField(interaction.fields.getTextInputValue("project_lead")),
      image: normalizeOptionalField(interaction.fields.getTextInputValue("image")),
      discord_link: normalizeOptionalField(linkLines[0]),
      link: normalizeOptionalField(linkLines[1]),
      notes: normalizeOptionalField(interaction.fields.getTextInputValue("notes")),
      editor_user_ids: requestedEditorIds
    };

    const errors = validateEventInput({
      end_time: data.end_time,
      image: data.image,
      discord_link: data.discord_link,
      link: data.link
    });

    if (errors.length > 0) {
      await replyAndExpire(interaction, {
        content: errors.join("\n"),
        ephemeral: true
      }, 45000);
      return;
    }

    let template;
    try {
      template = await createOrUpdateTemplate(data, interaction.user.id, templateId);
    } catch (error) {
      if (error?.code === "TEMPLATE_EDITOR_MANAGEMENT_DENIED" || error?.code === "TEMPLATE_ACCESS_DENIED") {
        await replyAndExpire(interaction, {
          content: error.message,
          ephemeral: true
        }, 45000);
        return;
      }

      throw error;
    }
    await replyWithWizardPreview(
      interaction,
      template,
      client,
      "template.extras_updated",
      "Zusatzangaben gespeichert. Wenn alles passt, kannst du das Event jetzt zur Pruefung senden."
    );
  }
}

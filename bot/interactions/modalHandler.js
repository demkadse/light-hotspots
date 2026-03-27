import {
  createOrUpdateTemplate,
  findPotentialDuplicates,
  findReusableTemplateDraft
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

function getTemplateIdFromModal(customId) {
  if (customId === "event_modal_basics_create") {
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

export async function handleModal(interaction, client) {
  if (interaction.customId === "event_modal_basics_create" || interaction.customId.startsWith("event_modal_basics_")) {
    await deferEphemeral(interaction);

    const data = {
      title: interaction.fields.getTextInputValue("title").trim(),
      venue: interaction.fields.getTextInputValue("venue").trim(),
      date: interaction.fields.getTextInputValue("date").trim(),
      time: interaction.fields.getTextInputValue("time").trim(),
      description: interaction.fields.getTextInputValue("description").trim(),
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
      "Basisdaten gespeichert. Waehle jetzt Kategorie, Typ und Server ueber die Menues darunter."
    );
    return;
  }

  if (interaction.customId.startsWith("event_modal_extras_")) {
    await deferEphemeral(interaction);

    const templateId = getTemplateIdFromModal(interaction.customId);
    const linkLines = interaction.fields
      .getTextInputValue("links")
      .split(/\r?\n/)
      .map(entry => entry.trim())
      .filter(Boolean);
    const data = {
      end_time: normalizeOptionalField(interaction.fields.getTextInputValue("end_time")),
      project_lead: normalizeOptionalField(interaction.fields.getTextInputValue("project_lead")),
      image: normalizeOptionalField(interaction.fields.getTextInputValue("image")),
      discord_link: normalizeOptionalField(linkLines[0]),
      link: normalizeOptionalField(linkLines[1]),
      notes: normalizeOptionalField(interaction.fields.getTextInputValue("notes"))
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

    const template = await createOrUpdateTemplate(data, interaction.user.id, templateId);
    await replyWithWizardPreview(
      interaction,
      template,
      client,
      "template.extras_updated",
      "Zusatzangaben gespeichert. Wenn alles passt, kannst du das Event jetzt zur Pruefung senden."
    );
  }
}

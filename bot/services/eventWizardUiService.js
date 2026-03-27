import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";

import {
  HOUSING_DISTRICT_OPTIONS,
  HOUSING_WARD_OPTIONS,
  HOUSING_PLOT_OPTIONS,
  SERVER_OPTIONS,
  buildVenueLabel,
  getCategoryLabel,
  getRecurrenceLabel,
  getTypeOptions,
  isTypeValidForCategory,
  normalizeCategory,
  normalizeRecurrence,
  parseVenueSelection
} from "../config/eventFormOptions.js";

const WARD_PAGE_SIZE = 15;
const PLOT_PAGE_SIZE = 20;

function normalizeOptional(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function formatTimeLabel(template) {
  if (template?.time && template?.end_time) {
    return `${template.time} - ${template.end_time}`;
  }

  return template?.time || "-";
}

function formatRecurrenceLabel(template) {
  return getRecurrenceLabel(template?.recurrence_rule);
}

function resolveProjectLead(template) {
  return template?.project_lead || template?.venue_lead || template?.host_display_name || null;
}

function addFieldIfValue(embed, name, value, inline = true) {
  if (!value) {
    return;
  }

  embed.addFields({ name, value, inline });
}

function resolveHousingDistrict(template) {
  return normalizeOptional(template?.housing_district) || parseVenueSelection(template?.venue).district;
}

function resolveHousingWard(template) {
  return normalizeOptional(template?.housing_ward) || parseVenueSelection(template?.venue).ward;
}

function resolveHousingPlot(template) {
  return normalizeOptional(template?.housing_plot) || parseVenueSelection(template?.venue).plot;
}

function resolveVenueLabel(template) {
  return buildVenueLabel(
    resolveHousingDistrict(template),
    resolveHousingWard(template),
    resolveHousingPlot(template)
  ) || template?.venue || null;
}

function buildMissingRequirementLines(template) {
  const missing = [];

  if (!normalizeCategory(template?.category)) {
    missing.push("Kategorie");
  }

  if (!resolveHousingDistrict(template)) {
    missing.push("Wohngebiet");
  }

  if (!resolveHousingWard(template)) {
    missing.push("Bezirk");
  }

  if (!resolveHousingPlot(template)) {
    missing.push("Hausnummer");
  }

  if (!normalizeOptional(template?.event_type || template?.type)) {
    missing.push("Typ");
  }

  if (!normalizeOptional(template?.server)) {
    missing.push("Server");
  }

  return missing;
}

function getAddressMissingLines(template) {
  return buildMissingRequirementLines(template).filter(entry => (
    entry === "Wohngebiet" || entry === "Bezirk" || entry === "Hausnummer"
  ));
}

function getDetailsMissingLines(template) {
  return buildMissingRequirementLines(template).filter(entry => (
    entry === "Kategorie" || entry === "Typ" || entry === "Server"
  ));
}

function withCurrentOption(options, currentValue, fallbackLabel = null) {
  const normalizedValue = String(currentValue || "").trim();
  if (!normalizedValue) {
    return options;
  }

  if (options.some(option => option.value === normalizedValue)) {
    return options;
  }

  return [
    {
      label: fallbackLabel || normalizedValue,
      value: normalizedValue,
      description: "Bereits gespeicherter Wert."
    },
    ...options
  ];
}

function createSelectRow({
  customId,
  placeholder,
  options,
  disabled = false
}) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(1)
      .setMaxValues(1)
      .setDisabled(disabled)
      .addOptions(options.slice(0, 25))
  );
}

function getPageCount(options, pageSize) {
  return Math.max(1, Math.ceil(options.length / pageSize));
}

function clampPage(value, options, pageSize) {
  const maxPage = getPageCount(options, pageSize) - 1;
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(numericValue), 0), maxPage);
}

function getSelectedPage(value, options, pageSize) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return 0;
  }

  return clampPage(Math.floor((numericValue - 1) / pageSize), options, pageSize);
}

function getPagedRange(options, pageSize, page, labelPrefix) {
  const safePage = clampPage(page, options, pageSize);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, options.length);

  return {
    page: safePage,
    start,
    end,
    label: `${labelPrefix} ${start + 1}-${end}`
  };
}

function buildAddressRows(template, options = {}) {
  const district = resolveHousingDistrict(template);
  const ward = resolveHousingWard(template);
  const plot = resolveHousingPlot(template);
  const wardPage = options.wardPage === undefined
    ? getSelectedPage(ward, HOUSING_WARD_OPTIONS, WARD_PAGE_SIZE)
    : clampPage(options.wardPage, HOUSING_WARD_OPTIONS, WARD_PAGE_SIZE);
  const plotPage = options.plotPage === undefined
    ? getSelectedPage(plot, HOUSING_PLOT_OPTIONS, PLOT_PAGE_SIZE)
    : clampPage(options.plotPage, HOUSING_PLOT_OPTIONS, PLOT_PAGE_SIZE);
  const wardRange = getPagedRange(HOUSING_WARD_OPTIONS, WARD_PAGE_SIZE, wardPage, "Bezirke");
  const plotRange = getPagedRange(HOUSING_PLOT_OPTIONS, PLOT_PAGE_SIZE, plotPage, "Häuser");
  const districtOptions = withCurrentOption(HOUSING_DISTRICT_OPTIONS, district);
  const wardOptions = withCurrentOption(
    HOUSING_WARD_OPTIONS.slice(wardRange.start, wardRange.end),
    ward,
    ward ? `Bezirk ${ward}` : null
  );
  const plotOptions = withCurrentOption(
    HOUSING_PLOT_OPTIONS.slice(plotRange.start, plotRange.end),
    plot,
    plot ? `Haus ${plot}` : null
  );
  const canSubmit = buildMissingRequirementLines(template).length === 0;

  return [
    createSelectRow({
      customId: `event:district:${template.id}`,
      placeholder: district ? `Wohngebiet: ${district}` : "2/3a | Wohngebiet wählen",
      options: districtOptions
    }),
    createSelectRow({
      customId: `event:ward:${template.id}`,
      placeholder: ward ? `Bezirk: ${ward}` : `2/3b | ${wardRange.label} wählen`,
      options: wardOptions
    }),
    createSelectRow({
      customId: `event:house:${template.id}`,
      placeholder: plot ? `Hausnummer: ${plot}` : `2/3c | ${plotRange.label} wählen`,
      options: plotOptions
    }),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:viewDetails:${template.id}`)
        .setLabel("3/3 Eckdaten")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`event:wardPage:${template.id}:${(wardRange.page + 1) % getPageCount(HOUSING_WARD_OPTIONS, WARD_PAGE_SIZE)}`)
        .setLabel(wardRange.label)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`event:plotPage:${template.id}:${(plotRange.page + 1) % getPageCount(HOUSING_PLOT_OPTIONS, PLOT_PAGE_SIZE)}`)
        .setLabel(plotRange.label)
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:editBasics:${template.id}`)
        .setLabel("1/3 Basisdaten")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`event:submit:${template.id}`)
        .setLabel("Jetzt zur Prüfung senden")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canSubmit)
    )
  ];
}

function buildDetailRows(template) {
  const category = normalizeCategory(template?.category);
  const typeOptions = withCurrentOption(
    getTypeOptions(category),
    template?.event_type || template?.type
  );
  const serverOptions = withCurrentOption(SERVER_OPTIONS, template?.server);
  const recurrenceValue = normalizeRecurrence(template?.recurrence_rule) || "none";
  const canSubmit = buildMissingRequirementLines(template).length === 0;

  return [
    createSelectRow({
      customId: `event:type:${template.id}`,
      placeholder: normalizeOptional(template?.event_type || template?.type)
        ? `Typ: ${template.event_type || template.type}`
        : "3/3a | Typ wählen",
      options: typeOptions,
      disabled: !category
    }),
    createSelectRow({
      customId: `event:server:${template.id}`,
      placeholder: template?.server ? `Server: ${template.server}` : "3/3b | Server wählen",
      options: serverOptions
    }),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:viewAddress:${template.id}`)
        .setLabel("2/3 Adresse")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`event:extras:${template.id}`)
        .setLabel("Zusatzangaben")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`event:recurrenceCycle:${template.id}`)
        .setLabel(recurrenceValue === "none"
          ? "Wiederholung: Keine"
          : `Wiederholung: ${getRecurrenceLabel(recurrenceValue) || recurrenceValue}`)
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`event:editBasics:${template.id}`)
        .setLabel("1/3 Basisdaten")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`event:submit:${template.id}`)
        .setLabel("Jetzt zur Prüfung senden")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canSubmit)
    )
  ];
}

export function buildBasicsModal(template = null, modalId = "event_modal_basics_create") {
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("1/3 | Basisdaten");

  const createInput = (id, label, placeholder, value = "") =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setPlaceholder(placeholder)
        .setValue(value || "")
        .setStyle(id === "description" ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(true)
    );

  modal.addComponents(
    createInput("title", "Titel", "z.B. Club Night", template?.title),
    createInput("date", "Datum", "z.B. 20.03.2026", template?.date),
    createInput("time", "Startzeit", "z.B. 20:00", template?.time),
    createInput("description", "Beschreibung", "Worum geht es?", template?.description)
  );

  return modal;
}

export function buildExtrasModal(template, templateId) {
  const modal = new ModalBuilder()
    .setCustomId(`event_modal_extras_${templateId}`)
    .setTitle("Zusatzangaben");

  const createInput = (id, label, placeholder, value = "", style = TextInputStyle.Short) =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setPlaceholder(placeholder)
        .setValue(value || "")
        .setStyle(style)
        .setRequired(false)
    );

  modal.addComponents(
    createInput("end_time", "Endzeit (optional)", "z.B. 23:30", template?.end_time),
    createInput("project_lead", "Projektleitung (optional)", "z.B. Käptn Mira", resolveProjectLead(template)),
    createInput("image", "Banner-URL (optional)", "https://example.com/event.jpg", template?.image),
    createInput(
      "links",
      "Links (optional)",
      "1. Zeile Discord-Link, 2. Zeile externer Link",
      [template?.discord_link, template?.link].filter(Boolean).join("\n"),
      TextInputStyle.Paragraph
    ),
    createInput(
      "notes",
      "Hinweise (optional)",
      "z.B. Walk-ins willkommen, 18+, OOC-Tell vorab",
      template?.notes,
      TextInputStyle.Paragraph
    )
  );

  return modal;
}

export function buildPreviewEmbed(template, duplicates = []) {
  const embed = new EmbedBuilder()
    .setTitle(template?.title || "Unbenannt")
    .setDescription(template?.description || "-")
    .addFields(
      { name: "Ort", value: resolveVenueLabel(template) || "-", inline: true },
      { name: "Datum", value: template?.date || "-", inline: true },
      { name: "Zeit", value: formatTimeLabel(template), inline: true }
    );

  addFieldIfValue(embed, "Kategorie", normalizeCategory(template?.category) ? getCategoryLabel(template?.category) : null, true);
  addFieldIfValue(embed, "Typ", template?.event_type || template?.type, true);
  addFieldIfValue(embed, "Server", template?.server, true);
  addFieldIfValue(embed, "Projektleitung", resolveProjectLead(template), true);
  addFieldIfValue(embed, "Wiederholung", formatRecurrenceLabel(template), true);
  addFieldIfValue(embed, "Discord", template?.discord_link, false);
  addFieldIfValue(embed, "Externer Link", template?.link, false);
  addFieldIfValue(embed, "Hinweise", template?.notes?.slice(0, 1024), false);

  const missing = buildMissingRequirementLines(template);
  if (missing.length > 0) {
    embed.addFields({
      name: "Noch offen",
      value: missing.map(entry => `- ${entry}`).join("\n"),
      inline: false
    });
  }

  if (template?.image) {
    embed.setImage(template.image);
  }

  if (duplicates.length > 0) {
    embed.addFields({
      name: "Mögliche Duplikate",
      value: duplicates
        .map(entry => `${entry.title} | ${entry.venue} | ${entry.date}`)
        .join("\n")
        .slice(0, 1024),
      inline: false
    });
  }

  return embed;
}

export function buildWizardComponents(template, options = {}) {
  return options.mode === "details"
    ? buildDetailRows(template)
    : buildAddressRows(template, options);
}

export function buildWizardMessage(template, options = {}) {
  const missing = buildMissingRequirementLines(template);

  if (missing.length === 0) {
    return "Alle Pflichtangaben sind vorhanden. Du kannst jetzt noch Zusatzangaben ergänzen oder das Event direkt zur Prüfung senden.";
  }

  if (options.mode === "details") {
    const detailMissing = getDetailsMissingLines(template);
    if (detailMissing.length === 0) {
      return "Die Eckdaten sind vollständig. Wenn die Adresse schon passt, kannst du jetzt Zusatzangaben ergänzen oder direkt zur Prüfung senden.";
    }

    return `Bitte ergänze jetzt die restlichen Eckdaten per Dropdown: ${detailMissing.join(", ")}.`;
  }

  const addressMissing = getAddressMissingLines(template);
  if (addressMissing.length === 0) {
    return "Die Adresse ist vollständig. Wechsle jetzt zu den Eckdaten oder ergänze weitere Angaben.";
  }

  return `Bitte vervollständige jetzt die Adresse per Dropdown: ${addressMissing.join(", ")}.`;
}

export function buildTemplateSummary(template) {
  return [
    `**${template.title || "Unbenannt"}**`,
    `Kategorie: ${getCategoryLabel(template.category)}`,
    template.event_type || template.type ? `Typ: ${template.event_type || template.type}` : null,
    resolveVenueLabel(template) ? `Ort: ${resolveVenueLabel(template)}` : null,
    template.server ? `Server: ${template.server}` : null,
    template.date ? `Datum: ${template.date}` : null,
    template.time ? `Zeit: ${formatTimeLabel(template)}` : null,
    resolveProjectLead(template) ? `Projektleitung: ${resolveProjectLead(template)}` : null
  ].filter(Boolean).join("\n");
}

export function buildApprovalWaitingMessage(template) {
  return [
    "Dein Event wurde zur Prüfung eingereicht.",
    "",
    buildTemplateSummary(template),
    "",
    "Die Bearbeitung der Freigaben läuft zu folgenden Zeiten:",
    "Montag bis Donnerstag: 08:30 bis 22:00 Uhr",
    "Freitag bis Samstag: 10:00 bis 02:00 Uhr",
    "Sonntag: 10:00 bis 22:00 Uhr",
    "",
    "Sobald es ein Update gibt, bekommst du direkt eine Nachricht."
  ].join("\n");
}

export function resolveProjectLeadForDisplay(template) {
  return resolveProjectLead(template);
}

export function resolveVenueForDisplay(template) {
  return resolveVenueLabel(template);
}

export function normalizeOptionalField(value) {
  return normalizeOptional(value);
}

export function shouldResetTypeForCategory(currentType, category) {
  return Boolean(currentType) && !isTypeValidForCategory(currentType, category);
}

export { normalizeRecurrence };

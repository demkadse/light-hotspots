// SUBMIT BUTTON
if (id.startsWith("event:submit:")) {
  const templateId = id.split(":")[2];

  const { submitTemplateForApproval } = await import("../services/templateService.js");
  const { CHANNELS } = await import("../config/channels.js");

  const template = await submitTemplateForApproval(templateId);

  const channel = await client.channels.fetch(CHANNELS.APPROVAL_CHANNEL);

  if (!channel) throw new Error("Approval Channel fehlt");

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
    content: `📦 Neues Event von <@${template.created_by}>`,
    components: [row]
  });

  await interaction.reply({
    content: "📨 Event wurde zur Prüfung gesendet!",
    ephemeral: true
  });

  return;
}
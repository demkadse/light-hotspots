export async function upsertPanelMessage(channel, botUserId, customIds, payload) {
  if (!channel?.isTextBased()) {
    throw new Error("Panel-Channel ist nicht textbasiert.");
  }

  const customIdSet = new Set(customIds);
  const messages = await channel.messages.fetch({ limit: 50 });

  const existingPanels = [...messages.values()]
    .filter(message => message.author?.id === botUserId)
    .filter(message =>
      message.components?.some(row =>
        row.components?.some(component => customIdSet.has(component.customId))
      )
    )
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp);

  const [latestPanel, ...stalePanels] = existingPanels;

  for (const stalePanel of stalePanels) {
    try {
      await stalePanel.delete();
    } catch {
      // Ignore messages that are already gone or cannot be deleted.
    }
  }

  if (latestPanel) {
    return latestPanel.edit(payload);
  }

  return channel.send(payload);
}

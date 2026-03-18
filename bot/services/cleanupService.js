const CLEANUP_CHANNEL_IDS = [
  "1483731940648550441",
  "1483731963868090480",
  "1483732008214593668",
  "1483755118946943126"
];

async function deleteBotMessagesInChannel(channel, botUserId) {
  let deleted = 0;
  let before;
  let scannedBatches = 0;

  while (scannedBatches < 10) {
    const messages = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {})
    });

    if (messages.size === 0) {
      break;
    }

    for (const message of messages.values()) {
      if (message.author?.id !== botUserId) {
        continue;
      }

      try {
        await message.delete();
        deleted += 1;
      } catch {
        // Ignore messages that cannot be deleted anymore.
      }
    }

    before = messages.last().id;
    scannedBatches += 1;
  }

  return deleted;
}

export async function cleanupBotMessages(client) {
  const summary = [];

  for (const channelId of CLEANUP_CHANNEL_IDS) {
    const channel = await client.channels.fetch(channelId);

    if (!channel?.isTextBased?.()) {
      summary.push({ channelId, deleted: 0, skipped: true });
      continue;
    }

    const deleted = await deleteBotMessagesInChannel(channel, client.user.id);
    summary.push({ channelId, deleted, skipped: false });
  }

  return summary;
}

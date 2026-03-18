function scheduleDelete(interaction, delayMs) {
  const timer = setTimeout(async () => {
    try {
      await interaction.deleteReply();
    } catch {
      // Ignore replies that are already gone or cannot be deleted anymore.
    }
  }, delayMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

export async function replyAndExpire(interaction, payload, delayMs = 30000) {
  await interaction.reply(payload);
  scheduleDelete(interaction, delayMs);
}

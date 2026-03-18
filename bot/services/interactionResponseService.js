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

function shouldIgnoreInteractionError(error) {
  return error?.code === 10062 || error?.code === 40060;
}

export async function replyAndExpire(interaction, payload, delayMs = 30000) {
  try {
    if (interaction.deferred) {
      await interaction.editReply(payload);
      scheduleDelete(interaction, delayMs);
      return true;
    }

    if (interaction.replied) {
      await interaction.followUp(payload);
      return true;
    }

    await interaction.reply(payload);
    scheduleDelete(interaction, delayMs);
    return true;
  } catch (error) {
    if (shouldIgnoreInteractionError(error)) {
      console.warn("Interaction response skipped:", error.code);
      return false;
    }

    throw error;
  }
}

export async function deferEphemeral(interaction) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    return true;
  } catch (error) {
    if (shouldIgnoreInteractionError(error)) {
      console.warn("Interaction defer skipped:", error.code);
      return false;
    }

    throw error;
  }
}

import { MessageFlags } from "discord.js";

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

function normalizeInteractionPayload(payload) {
  if (!payload || typeof payload !== "object" || !("ephemeral" in payload)) {
    return payload;
  }

  const nextPayload = { ...payload };

  if (nextPayload.ephemeral) {
    nextPayload.flags = nextPayload.flags ?? MessageFlags.Ephemeral;
  }

  delete nextPayload.ephemeral;
  return nextPayload;
}

export async function replyAndExpire(interaction, payload, delayMs = 30000) {
  const normalizedPayload = normalizeInteractionPayload(payload);

  try {
    if (interaction.deferred) {
      await interaction.editReply(normalizedPayload);
      scheduleDelete(interaction, delayMs);
      return true;
    }

    if (interaction.replied) {
      await interaction.followUp(normalizedPayload);
      return true;
    }

    await interaction.reply(normalizedPayload);
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
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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

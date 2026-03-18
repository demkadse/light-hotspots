const cooldowns = new Map();

export function assertActionCooldown(userId, action, cooldownMs) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const expiresAt = cooldowns.get(key) || 0;

  if (expiresAt > now) {
    const remainingSeconds = Math.ceil((expiresAt - now) / 1000);
    const error = new Error(`Bitte warte noch ${remainingSeconds}s.`);
    error.code = "ACTION_COOLDOWN";
    throw error;
  }

  cooldowns.set(key, now + cooldownMs);
}

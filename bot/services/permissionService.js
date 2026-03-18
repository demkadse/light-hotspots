import { ADMIN_USER_IDS } from "../config/admins.js";

export function isAdminUser(userId) {
  return ADMIN_USER_IDS.includes(userId);
}

export function assertAdminUser(interaction) {
  if (!isAdminUser(interaction.user.id)) {
    const error = new Error("Nur Admins duerfen diese Aktion ausfuehren.");
    error.code = "ADMIN_ONLY";
    throw error;
  }
}

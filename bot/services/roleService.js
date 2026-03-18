import { ROLES } from "../config/roles.js";

export function getUserRoleLevel(member) {
  if (member.permissions.has("Administrator")) return "admin";
  if (member.roles.cache.has(ROLES.VENUE_HEAD)) return "head";
  if (member.roles.cache.has(ROLES.VENUE_STAFF)) return "staff";
  return "user";
}

export function hasTemplateAccess(member, templateOwnerId) {
  const role = getUserRoleLevel(member);

  if (role === "admin") return true;
  if (role === "head" && member.id === templateOwnerId) return true;

  return false;
}

export function canCreateEvent(member) {
  const role = getUserRoleLevel(member);

  return role === "admin" || role === "head" || role === "staff";
}

export function canEditTemplate(member, templateOwnerId) {
  const role = getUserRoleLevel(member);

  if (role === "admin") return true;
  if (role === "head" && member.id === templateOwnerId) return true;

  return false;
}

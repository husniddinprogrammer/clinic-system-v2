import type { Role } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "patients:view"
  | "patients:create"
  | "patients:edit"
  | "patients:delete"
  | "visits:view"
  | "visits:create"
  | "visits:edit"
  | "visits:delete"
  | "reports:view"
  | "notifications:view"
  | "users:manage"
  | "backup:manage"
  | "settings:view";

export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard:view": "Dashboard",
  "patients:view": "Bemorlarni ko'rish",
  "patients:create": "Bemor qo'shish",
  "patients:edit": "Bemorni tahrirlash",
  "patients:delete": "Bemorni deaktiv/aktiv qilish",
  "visits:view": "Tashriflarni ko'rish",
  "visits:create": "Tashrif qo'shish",
  "visits:edit": "Tashrifni tahrirlash",
  "visits:delete": "Tashrifni deaktiv/aktiv qilish",
  "reports:view": "Hisobotlar",
  "notifications:view": "Bildirishnomalar",
  "users:manage": "User Management",
  "backup:manage": "Backup boshqaruvi",
  "settings:view": "Sozlamalar",
};

export const ALL_PERMISSIONS = Object.keys(
  PERMISSION_LABELS,
) as Permission[];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  DOCTOR: [
    "dashboard:view",
    "patients:view",
    "patients:create",
    "visits:view",
    "visits:create",
    "reports:view",
    "settings:view",
  ],
};

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

type UserLike = { role: Role; permissions?: unknown };

export function getUserPermissions(user: UserLike): Permission[] {
  // ADMIN har doim barcha ruxsatlarga ega
  if (user.role === "ADMIN") return ROLE_PERMISSIONS.ADMIN;
  if (Array.isArray(user.permissions)) {
    const set = new Set<string>(ALL_PERMISSIONS);
    return (user.permissions as unknown[]).filter(
      (p): p is Permission => typeof p === "string" && set.has(p),
    );
  }
  return ROLE_PERMISSIONS[user.role] ?? [];
}

export function hasPermission(user: UserLike, permission: Permission): boolean {
  return getUserPermissions(user).includes(permission);
}

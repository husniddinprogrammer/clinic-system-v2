import { Role } from "@prisma/client";

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
  | "users:manage"
  | "backup:manage"
  | "settings:view";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "dashboard:view",
    "patients:view",
    "patients:create",
    "patients:edit",
    "patients:delete",
    "visits:view",
    "visits:create",
    "visits:edit",
    "visits:delete",
    "reports:view",
    "users:manage",
    "backup:manage",
    "settings:view",
  ],
  DOCTOR: [
    "dashboard:view",
    "patients:view",
    "patients:create",
    "patients:edit",
    "visits:view",
    "visits:create",
    "visits:edit",
    "reports:view",
  ],
  NURSE: [
    "dashboard:view",
    "patients:view",
    "patients:create",
    "patients:edit",
    "visits:view",
    "visits:create",
    "visits:edit",
    "reports:view",
  ],
};

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return getPermissions(role).includes(permission);
}

export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}

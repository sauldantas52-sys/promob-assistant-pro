import { type AppRole } from "./auth";

type Permission = "view" | "edit" | "delete" | "approve" | "import";

const rolePermissions: Record<AppRole, Record<string, Permission[]>> = {
  admin: {
    projects: ["view", "edit", "delete", "approve", "import"],
    production: ["view", "edit", "approve"],
    assembly: ["view", "edit"],
    shipping: ["view", "edit"],
    settings: ["view", "edit"],
  },
  escritorio: {
    projects: ["view", "edit", "import", "approve"],
    production: ["view"],
    assembly: ["view"],
    shipping: ["view"],
  },
  fabrica: {
    projects: ["view"],
    production: ["view", "edit"],
    shipping: ["view", "edit"],
    picking: ["view", "edit"],
  },
  montador: {
    projects: ["view"],
    assembly: ["view", "edit"],
    picking: ["view", "edit"],
  },
  auditor: {
    projects: ["view"],
    production: ["view"],
    assembly: ["view"],
    shipping: ["view"],
    picking: ["view"],
  },
};

export function hasPermission(role: AppRole | null, resource: string, action: Permission): boolean {
  if (!role) return false;
  return rolePermissions[role]?.[resource]?.includes(action) ?? false;
}

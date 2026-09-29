"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import type { Permission } from "@/lib/permissions";
import { Icon, IconName } from "./icons";

type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  permission: Permission;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Tashriflar", href: "/visits", icon: "visits", permission: "visits:view" },
  { label: "Bemorlar", href: "/patients", icon: "patients", permission: "patients:view" },
  { label: "Hisobotlar", href: "/reports", icon: "reports", permission: "reports:view" },
  { label: "Doktorlar", href: "/doctors", icon: "doctors", permission: "users:manage" },
  { label: "User Management", href: "/users", icon: "users", permission: "users:manage" },
  { label: "Bildirishnomalar", href: "/notifications", icon: "bell", permission: "notifications:view" },
  { label: "Sozlamalar", href: "/settings", icon: "settings", permission: "settings:view" },
];

export function Sidebar({
  role,
  permissions,
  fullName,
  clinicName = "Klinika",
  logoUrl,
}: {
  role: Role;
  permissions: Permission[];
  fullName: string;
  clinicName?: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) =>
    permissions.includes(item.permission),
  );

  return (
    <aside className="w-60 bg-slate-800 text-slate-100 flex flex-col h-full shrink-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={clinicName}
              className="w-9 h-9 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
              +
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight truncate">
              {clinicName}
            </div>
            <div className="text-xs text-slate-400 leading-tight">Boshqaruv tizimi</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Icon name={item.icon} className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-700">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-semibold">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{fullName}</div>
            <div className="text-xs text-slate-400">{role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

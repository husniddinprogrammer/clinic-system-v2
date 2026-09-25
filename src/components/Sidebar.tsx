"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "M", roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { label: "Bemorlar", href: "/patients", icon: "P", roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { label: "Tashriflar", href: "/visits", icon: "V", roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { label: "Hisobotlar", href: "/reports", icon: "H", roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { label: "Excel Import", href: "/import", icon: "E", roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { label: "Doktorlar", href: "/doctors", icon: "D", roles: ["ADMIN"] },
  { label: "User Management", href: "/users", icon: "U", roles: ["ADMIN"] },
  { label: "Backup", href: "/backup", icon: "B", roles: ["ADMIN"] },
  { label: "Sozlamalar", href: "/settings", icon: "S", roles: ["ADMIN"] },
];

export function Sidebar({ role, fullName }: { role: Role; fullName: string }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-60 bg-slate-800 text-slate-100 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
            +
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">Klinika</div>
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
              <span className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded bg-slate-600/50">
                {item.icon}
              </span>
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

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getClinicSettings } from "@/lib/settings";
import { Topbar } from "@/components/Topbar";
import { SettingsPassword } from "@/components/SettingsPassword";
import { SettingsClinic } from "@/components/SettingsClinic";
import { SettingsBackup } from "@/components/SettingsBackup";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!hasPermission(user, "settings:view")) {
    return (
      <>
        <Topbar title="Sozlamalar" />
        <main className="flex-1 p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            Bu sahifaga kirish uchun ruxsat yo&apos;q.
          </div>
        </main>
      </>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const canBackup = hasPermission(user, "backup:manage");
  const clinic = isAdmin ? await getClinicSettings() : null;

  return (
    <>
      <Topbar title="Sozlamalar" />
      <main className="flex-1 p-6 max-w-3xl space-y-4">
        {isAdmin && clinic && (
          <SettingsClinic
            initialName={clinic.name}
            hasLogo={clinic.hasLogo}
            logoVersion={clinic.updatedAt.getTime()}
          />
        )}

        <SettingsPassword />

        {canBackup && <SettingsBackup />}

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            Tizim ma'lumotlari
          </h2>
          <div className="text-sm text-slate-600 space-y-1.5">
            <div>
              <span className="text-slate-400">Database: </span>PostgreSQL 16
            </div>
            <div>
              <span className="text-slate-400">ORM: </span>Prisma 6
            </div>
            <div>
              <span className="text-slate-400">Framework: </span>Next.js 16
            </div>
            <div>
              <span className="text-slate-400">Rejim: </span>Offline / Local
              Network
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

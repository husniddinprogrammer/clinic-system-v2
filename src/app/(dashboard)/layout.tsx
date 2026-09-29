import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";
import { getClinicSettings } from "@/lib/settings";
import { Sidebar } from "@/components/Sidebar";
import { ensureDailyBackup } from "@/lib/backup";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const clinic = await getClinicSettings();
  await ensureDailyBackup();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={user.role}
        permissions={getUserPermissions(user)}
        fullName={user.full_name}
        clinicName={clinic.name}
        logoUrl={
          clinic.hasLogo
            ? `/api/settings?action=logo&v=${clinic.updatedAt.getTime()}`
            : null
        }
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getClinicSettings } from "@/lib/settings";
import { Sidebar } from "@/components/Sidebar";

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

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={user.role}
        fullName={user.full_name}
        clinicName={clinic.name}
        logoUrl={
          clinic.hasLogo
            ? `/api/settings?action=logo&v=${clinic.updatedAt.getTime()}`
            : null
        }
      />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}

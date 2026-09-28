import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getClinicSettings } from "@/lib/settings";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/visits");
  }
  const clinic = await getClinicSettings();
  return (
    <LoginForm
      clinicName={clinic.name}
      logoUrl={
        clinic.hasLogo
          ? `/api/settings?action=logo&v=${clinic.updatedAt.getTime()}`
          : null
      }
    />
  );
}

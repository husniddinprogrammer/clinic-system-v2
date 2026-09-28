import { prisma } from "./prisma";

const SETTINGS_ID = 1;

export type ClinicSettings = {
  name: string;
  hasLogo: boolean;
  updatedAt: Date;
};

export async function getClinicSettings(): Promise<ClinicSettings> {
  const settings = await prisma.clinicSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
    select: {
      name: true,
      updated_at: true,
    },
  });

  const hasLogo =
    (await prisma.clinicSettings.count({
      where: { id: SETTINGS_ID, NOT: { logo: null } },
    })) > 0;

  return {
    name: settings.name,
    hasLogo,
    updatedAt: settings.updated_at,
  };
}

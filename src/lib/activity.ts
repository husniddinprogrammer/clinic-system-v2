import { prisma } from "./prisma";
import type { ActivityType } from "@prisma/client";

export async function logActivity(params: {
  type: ActivityType;
  action: string;
  message: string;
  userId?: number | null;
  userName?: string | null;
  entityId?: number | null;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        type: params.type,
        action: params.action,
        message: params.message,
        user_id: params.userId ?? null,
        user_name: params.userName ?? null,
        entity_id: params.entityId ?? null,
      },
    });
  } catch {
    // Log yozishdagi xato asosiy amalni to'xtatmasligi kerak
  }
}

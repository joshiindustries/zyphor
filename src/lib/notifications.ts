import { prisma } from "@/lib/db";

type NotificationType = "MESSAGE" | "GROUP_MESSAGE" | "CALL" | "SYSTEM";

type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  link?: string | null;
};

function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function createNotification(input: NotificationInput) {
  if (!input.userId || !input.title) return null;

  return prisma.notification.create({
    data: {
      user_id: input.userId,
      type: input.type,
      title: cleanText(input.title, 160),
      body: input.body ? cleanText(input.body, 500) : null,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      link: input.link || null,
    },
  });
}

export async function createNotifications(inputs: NotificationInput[]) {
  const rows = inputs
    .filter((input) => input.userId && input.title)
    .map((input) => ({
      user_id: input.userId,
      type: input.type,
      title: cleanText(input.title, 160),
      body: input.body ? cleanText(input.body, 500) : null,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      link: input.link || null,
    }));

  if (rows.length === 0) return { count: 0 };
  return prisma.notification.createMany({ data: rows });
}
import { z } from "zod";
import { NotificationType, ImportEntity, ImportStatus } from "@prisma/client";

export const NotificationFilterSchema = z.object({
  isRead: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
  type: z.nativeEnum(NotificationType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type NotificationFilterInput = z.infer<typeof NotificationFilterSchema>;

export const CreateNotificationSchema = z.object({
  userId: z.string().optional().nullable(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, "Title is required").max(191),
  message: z.string().min(1, "Message is required"),
  referenceId: z.string().optional().nullable(),
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;

export const ImportUploadSchema = z.object({
  entity: z.nativeEnum(ImportEntity),
});

export type ImportUploadInput = z.infer<typeof ImportUploadSchema>;

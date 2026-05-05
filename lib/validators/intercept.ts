import { z } from "zod";

export const interceptSchema = z
  .object({
    name: z.string().trim().min(2, "Имя слишком короткое"),
    phone: z
      .string()
      .trim()
      .refine((value) => /^7\d{10}$/.test(value.replace(/\D/g, "")), "Введите телефон в формате +7"),
    situation: z.string().trim().min(10, "Добавьте минимум 10 символов").max(400, "Максимум 400 символов"),
    delivery_channel: z.enum(["whatsapp", "sms", "telegram"], {
      message: "Выберите канал отправки клиенту",
    }),
    telegram_username: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.delivery_channel === "telegram") {
      const value = data.telegram_username || "";
      if (!/^@[a-zA-Z0-9_]{5,}$/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["telegram_username"],
          message: "Укажите Telegram username в формате @username",
        });
      }
    }
  });

export type InterceptFormValues = z.infer<typeof interceptSchema>;

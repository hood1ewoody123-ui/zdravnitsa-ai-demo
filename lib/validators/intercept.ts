import { z } from "zod";

export const interceptSchema = z.object({
  name: z.string().trim().min(2, "Имя слишком короткое"),
  phone: z
    .string()
    .trim()
    .refine((value) => /^7\d{10}$/.test(value.replace(/\D/g, "")), "Введите телефон в формате +7"),
  situation: z.string().trim().min(10, "Добавьте минимум 10 символов").max(400, "Максимум 400 символов"),
});

export type InterceptFormValues = z.infer<typeof interceptSchema>;

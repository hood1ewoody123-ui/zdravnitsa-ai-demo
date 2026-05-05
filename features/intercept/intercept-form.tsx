"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Send, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { interceptSchema, type InterceptFormValues } from "@/lib/validators/intercept";
import { useUiStore } from "@/store/ui-store";

type ResultCardData = {
  name: string;
  phone: string;
  situation: string;
  reply: string;
  time: string;
} | null;

function formatPhone(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  const normalized = digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  const raw = normalized.startsWith("7") ? normalized.slice(1) : normalized;

  const p1 = raw.slice(0, 3);
  const p2 = raw.slice(3, 6);
  const p3 = raw.slice(6, 8);
  const p4 = raw.slice(8, 10);

  let result = "+7";
  if (p1) result += ` (${p1}`;
  if (p1.length === 3) result += ")";
  if (p2) result += ` ${p2}`;
  if (p3) result += `-${p3}`;
  if (p4) result += `-${p4}`;
  return result;
}

export function InterceptForm() {
  const [result, setResult] = useState<ResultCardData>(null);
  const { interceptStatus, setInterceptStatus } = useUiStore();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InterceptFormValues>({
    resolver: zodResolver(interceptSchema),
    defaultValues: {
      name: "",
      phone: "",
      situation: "",
      delivery_channel: "whatsapp",
      telegram_username: "",
    },
  });

  const situationLen = watch("situation")?.length || 0;
  const phoneValue = watch("phone") || "";
  const deliveryChannel = watch("delivery_channel");

  const statusClass = useMemo(() => {
    if (interceptStatus.includes("ошибка")) return "text-error";
    if (interceptStatus.includes("успешно")) return "text-success";
    return "text-muted";
  }, [interceptStatus]);

  const onSubmit = handleSubmit(async (values) => {
    setInterceptStatus("");
    try {
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "intercept", situation: values.situation }),
      });
      const chatPayload = await chatResponse.json();
      if (!chatResponse.ok) throw new Error(chatPayload?.error || "ошибка ИИ");

      const reply = chatPayload?.reply || "Спасибо, заявку получили. Сейчас свяжемся и уточним детали.";

      const notifyResponse = await fetch("/api/intercept-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone,
          situation: values.situation,
          agent_reply: reply,
          delivery_channel: values.delivery_channel,
          telegram_username: values.telegram_username || null,
          timestamp: new Date().toISOString(),
        }),
      });
      const notifyPayload = await notifyResponse.json();
      if (!notifyResponse.ok) throw new Error(notifyPayload?.error || "ошибка webhook");

      setResult({
        name: values.name,
        phone: values.phone,
        situation: values.situation,
        reply,
        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      });
      setInterceptStatus(
        `Отправка успешно завершена, менеджер получил уведомление.${notifyPayload?.leadId ? ` ID заявки: ${notifyPayload.leadId}` : ""}`,
      );
    } catch (error) {
      setInterceptStatus(`Произошла ошибка: ${(error as Error).message}`);
    }
  });

  return (
    <Card className="mx-auto w-full max-w-xl">
      <h2 className="text-2xl font-semibold tracking-tight">Оставить заявку</h2>
      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Имя</label>
          <Input placeholder="Иван" autoComplete="name" {...register("name")} />
          <p className="mt-1 min-h-5 text-xs text-error">{errors.name?.message}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Телефон</label>
          <Input
            placeholder="+7 (999) 123-45-67"
            autoComplete="tel"
            value={phoneValue}
            onChange={(event) => setValue("phone", formatPhone(event.target.value), { shouldValidate: true })}
          />
          <p className="mt-1 min-h-5 text-xs text-error">{errors.phone?.message}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Канал автодоставки клиенту</label>
          <select
            className="flex h-11 w-full rounded-lg border border-outline bg-surface-container-high px-3 py-2 text-sm text-foreground"
            {...register("delivery_channel")}
          >
            <option value="whatsapp">WhatsApp (рекомендуется)</option>
            <option value="sms">SMS</option>
            <option value="telegram">Telegram</option>
          </select>
          <p className="mt-1 min-h-5 text-xs text-error">{errors.delivery_channel?.message}</p>
        </div>

        {deliveryChannel === "telegram" ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Telegram username клиента</label>
            <Input placeholder="@username" autoComplete="off" {...register("telegram_username")} />
            <p className="mt-1 min-h-5 text-xs text-error">{errors.telegram_username?.message}</p>
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Ситуация</label>
          <Textarea rows={4} placeholder="Кратко опишите ситуацию" maxLength={400} {...register("situation")} />
          <div className="mt-1 flex items-center justify-between">
            <p className="min-h-5 text-xs text-error">{errors.situation?.message}</p>
            <p className="text-xs text-muted">{situationLen}/400</p>
          </div>
        </div>

        <Button className="w-full" size="lg" disabled={isSubmitting}>
          <Send className="h-4 w-4" />
          {isSubmitting ? "Отправляем..." : "Отправить заявку"}
        </Button>

        <p className="text-xs text-muted">
          Если менеджер недоступен, система автоматически отправит клиенту сообщение в выбранный канал в течение ~30 секунд.
        </p>
        <p className={`min-h-5 text-sm ${statusClass}`}>{interceptStatus}</p>
      </form>

      {result ? (
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-xl border border-primary/40 bg-primary/10 p-5"
        >
          <div className="mb-3 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            <h3 className="font-semibold">Уведомление менеджеру</h3>
          </div>
          <p className="text-sm">
            <strong>Имя:</strong> {result.name}
          </p>
          <p className="text-sm">
            <strong>Телефон:</strong> {result.phone}
          </p>
          <p className="text-sm">
            <strong>Ситуация:</strong> {result.situation}
          </p>
          <p className="text-sm">
            <strong>Мила ответила:</strong> {result.reply}
          </p>
          <p className="text-xs text-muted">
            <strong>Время:</strong> {result.time}
          </p>
        </motion.article>
      ) : null}
    </Card>
  );
}

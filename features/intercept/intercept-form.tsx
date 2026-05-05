"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { interceptSchema, type InterceptFormValues } from "@/lib/validators/intercept";
import { useUiStore } from "@/store/ui-store";

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

function telegramInterceptDeepLink(leadId: string) {
  const bot = (process.env.NEXT_PUBLIC_TELEGRAM_INTERCEPT_BOT || "nnarcorehab_bot").replace(/^@/, "");
  return `https://t.me/${bot}?start=${encodeURIComponent(leadId)}`;
}

export function InterceptForm() {
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
    },
  });

  const situationLen = watch("situation")?.length || 0;
  const phoneValue = watch("phone") || "";

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
          timestamp: new Date().toISOString(),
        }),
      });
      const notifyPayload = (await notifyResponse.json()) as { leadId?: string; lead_id?: string; error?: string };
      if (!notifyResponse.ok) throw new Error(notifyPayload?.error || "ошибка webhook");

      const leadId = notifyPayload.lead_id ?? notifyPayload.leadId;
      if (!leadId) throw new Error("Сервер не вернул ID заявки");

      const deepLink = telegramInterceptDeepLink(leadId);
      window.open(deepLink, "_blank", "noopener,noreferrer");
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
          <label className="mb-1.5 block text-xs font-medium text-muted">Ситуация</label>
          <Textarea rows={4} placeholder="Кратко опишите ситуацию" maxLength={400} {...register("situation")} />
          <div className="mt-1 flex items-center justify-between">
            <p className="min-h-5 text-xs text-error">{errors.situation?.message}</p>
            <p className="text-xs text-muted">{situationLen}/400</p>
          </div>
        </div>

        <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {isSubmitting ? "Готовим ответ и заявку…" : "Отправить заявку"}
        </Button>

        <p className="text-xs text-muted">
          После отправки откроется Telegram-бот в новой вкладке; менеджер параллельно получит уведомление.
        </p>
        <p className={`min-h-5 text-sm ${statusClass}`}>{interceptStatus}</p>
      </form>
    </Card>
  );
}

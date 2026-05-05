"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGE =
  "Здравствуйте. Я Мила, консультант Здравницы. Расскажите, что сейчас происходит, и я помогу сориентироваться.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: INITIAL_MESSAGE }]);

  useEffect(() => {
    const savedSessionId = window.localStorage.getItem("mila_chat_session_id");
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  async function sendMessage() {
    const content = input.trim();
    if (!content || streaming) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          stream: true,
          sessionId,
          messages: nextMessages.map((item) => ({ role: item.role, content: item.content })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Стриминг ответа недоступен");
      }

      const responseSessionId = response.headers.get("x-session-id");
      if (responseSessionId && responseSessionId !== sessionId) {
        setSessionId(responseSessionId);
        window.localStorage.setItem("mila_chat_session_id", responseSessionId);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: assistantText };
          }
          return copy;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Не удалось получить ответ. Попробуйте еще раз через несколько секунд.",
        },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-40 flex h-[520px] w-[380px] flex-col rounded-2xl border border-outline bg-surface shadow-elev-3"
          >
            <div className="flex items-center justify-between border-b border-outline px-4 py-3">
              <div className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                <p className="text-sm font-semibold">Мила · Здравница</p>
              </div>
              <button
                type="button"
                aria-label="Закрыть чат"
                className="rounded-md p-1 text-muted hover:bg-surface-container hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={message.role === "user" ? "ml-10 rounded-2xl bg-primary p-3 text-sm text-primary-foreground" : "mr-10 rounded-2xl bg-surface-container p-3 text-sm text-foreground"}
                >
                  {message.content || (streaming ? "Мила печатает..." : "")}
                </div>
              ))}
            </div>

            <div className="border-t border-outline p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Напишите сообщение..."
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <Button type="button" className="h-11 w-11 rounded-full p-0" onClick={() => void sendMessage()} disabled={streaming}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                История переписки сохраняется для улучшения качества консультации.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Button
        type="button"
        variant="secondary"
        className="fixed bottom-6 right-6 z-30 rounded-full shadow-elev-2"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-4 w-4" />
        Мила онлайн
      </Button>
    </>
  );
}

import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const CHAT_MODEL = "anthropic/claude-sonnet-4-5";

const SYSTEM_PROMPTS: Record<string, string> = {
  intercept: `Ты Мила - консультант центра Здравница.
Человек только что оставил заявку на сайте.
Ответь тепло и коротко - 3-4 предложения.
Уточни один ключевой вопрос по ситуации.
В конце скажи, что готовы помочь прямо сейчас.
Никаких медицинских диагнозов и советов.
Тон: живой, человеческий, без канцелярита.`,
  protocol: `Ты помощник менеджера медицинского центра Здравница.
На основе транскрипта создай резюме звонка.
Верни только валидный JSON без markdown и пояснений:
{
  "situation": "одно предложение о ситуации клиента",
  "discussed": ["пункт 1", "пункт 2", "пункт 3"],
  "next_step": "конкретное следующее действие"
}`,
  chat: `Ты Мила - консультант центра Здравница (narcorehab.com).
Тон: теплый, живой, как внимательный человек.
Никаких медицинских диагнозов.
Если не знаешь - скажи, что уточнишь у врача.
Цель: довести человека до записи или вызова врача на дом.
После 3-го сообщения пользователя мягко предложи оставить контакт.
Максимум 4 предложения в ответе.`,
};

type ChatBody = {
  mode?: "intercept" | "protocol" | "chat";
  situation?: string;
  transcript?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
};

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function tryExtractJson(raw: string) {
  const direct = safeJsonParse(raw);
  if (direct) return direct;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return safeJsonParse(match[0]);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 500 });
  }

  const body = (await request.json()) as ChatBody;
  const mode = body.mode || "chat";
  const stream = Boolean(body.stream) && mode === "chat";
  const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

  let userMessages = body.messages || [];
  if (mode === "intercept") {
    if (!body.situation) return NextResponse.json({ error: "Missing field: situation" }, { status: 400 });
    userMessages = [{ role: "user", content: `Ситуация клиента: ${body.situation}` }];
  }
  if (mode === "protocol") {
    if (!body.transcript) return NextResponse.json({ error: "Missing field: transcript" }, { status: 400 });
    userMessages = [{ role: "user", content: `Транскрипт звонка:\n${body.transcript}` }];
  }

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.3,
        stream,
        messages: [{ role: "system", content: systemPrompt }, ...userMessages],
      }),
    });

    if (stream) {
      if (!upstream.ok || !upstream.body) {
        const failedPayload = await upstream.json().catch(() => null);
        return NextResponse.json(
          { error: "OpenRouter stream failed", details: failedPayload },
          { status: upstream.status || 500 },
        );
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = upstream.body.getReader();
      let buffer = "";

      const streamOut = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const data = trimmed.replace(/^data:\s*/, "");
                if (data === "[DONE]") continue;

                const parsed = safeJsonParse(data);
                const token = parsed?.choices?.[0]?.delta?.content;
                if (typeof token === "string" && token.length > 0) {
                  controller.enqueue(encoder.encode(token));
                }
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        },
      });

      return new Response(streamOut, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const payload = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "OpenRouter request failed", details: payload },
        { status: upstream.status },
      );
    }

    const content = payload?.choices?.[0]?.message?.content?.trim() || "";
    if (mode === "protocol") {
      const parsed = tryExtractJson(content);
      if (!parsed) {
        return NextResponse.json({ error: "Model returned non-JSON protocol response", raw: content }, { status: 502 });
      }
      return NextResponse.json(parsed);
    }
    return NextResponse.json({ reply: content });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

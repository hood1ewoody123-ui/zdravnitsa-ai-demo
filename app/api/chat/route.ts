import { NextResponse } from "next/server";
import { renderKnowledgeContext, retrieveKnowledge } from "@/lib/rag/retrieve";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
Сначала прояви эмпатию и задай 1 уточняющий вопрос по ситуации.
После 3-го сообщения пользователя мягко предложи запланировать звонок с врачом.
Контакт (телефон) проси только после явного согласия пользователя на звонок.
Если пользователь не готов оставить контакт, не дави и предложи продолжить диалог в чате.
Если информации недостаточно или вопрос медицински чувствительный, честно скажи, что нужен живой специалист.
Максимум 4 предложения в ответе.`,
};

type ChatBody = {
  mode?: "intercept" | "protocol" | "chat";
  situation?: string;
  transcript?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
  sessionId?: string;
};

type StoredChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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

async function ensureChatSession(sessionId?: string) {
  const supabase = createSupabaseServerClient();
  if (sessionId) {
    if (isUuid(sessionId)) {
      await supabase
        .from("chat_sessions_demo")
        .update({ status: "active", last_activity_at: new Date().toISOString() })
        .eq("id", sessionId);
      return sessionId;
    }

    // Telegram sends external keys like tg_<chat_id>, map them to a real UUID session.
    const { data: existingSession } = await supabase
      .from("chat_sessions_demo")
      .select("id")
      .eq("source", "telegram")
      .eq("visitor_fingerprint", sessionId)
      .maybeSingle();

    if (existingSession?.id) {
      await supabase
        .from("chat_sessions_demo")
        .update({ status: "active", last_activity_at: new Date().toISOString() })
        .eq("id", existingSession.id);
      return existingSession.id as string;
    }

    const { data: createdSession, error: createError } = await supabase
      .from("chat_sessions_demo")
      .insert({
        source: "telegram",
        visitor_fingerprint: sessionId,
        status: "active",
        last_activity_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError || !createdSession?.id) {
      throw new Error(`Unable to create telegram session: ${createError?.message || "unknown error"}`);
    }

    return createdSession.id as string;
  }

  const { data, error } = await supabase
    .from("chat_sessions_demo")
    .insert({ source: "widget", status: "active", last_activity_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Unable to create chat session: ${error?.message || "unknown error"}`);
  }
  return data.id as string;
}

async function saveChatMessage(params: {
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("chat_messages_demo").insert({
    session_id: params.sessionId,
    role: params.role,
    content: params.content,
    metadata: params.metadata || {},
  });

  if (error) {
    throw new Error(`Unable to save chat message: ${error.message}`);
  }

  await supabase
    .from("chat_sessions_demo")
    .update({ status: "active", last_activity_at: new Date().toISOString() })
    .eq("id", params.sessionId);
}

async function loadRecentChatMessages(sessionId: string, limit = 12) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_messages_demo")
    .select("role,content,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to load chat history: ${error.message}`);
  }

  return ((data || []) as StoredChatMessage[])
    .reverse()
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role, content: message.content }));
}

async function closeStaleSessions(inactiveMinutes = 30) {
  const supabase = createSupabaseServerClient();
  const thresholdIso = new Date(Date.now() - inactiveMinutes * 60_000).toISOString();
  const { error } = await supabase
    .from("chat_sessions_demo")
    .update({ status: "closed" })
    .eq("status", "active")
    .lt("last_activity_at", thresholdIso);

  if (error) {
    throw new Error(`Unable to close stale sessions: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 500 });
  }

  const body = (await request.json()) as ChatBody;
  const mode = body.mode || "chat";
  const stream = Boolean(body.stream) && mode === "chat";
  const baseSystemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
  let chatSessionId = body.sessionId || "";
  let retrievedChunksCount = 0;

  let userMessages = body.messages || [];
  if (mode === "intercept") {
    if (!body.situation) return NextResponse.json({ error: "Missing field: situation" }, { status: 400 });
    userMessages = [{ role: "user", content: `Ситуация клиента: ${body.situation}` }];
  }
  if (mode === "protocol") {
    if (!body.transcript) return NextResponse.json({ error: "Missing field: transcript" }, { status: 400 });
    userMessages = [{ role: "user", content: `Транскрипт звонка:\n${body.transcript}` }];
  }

  if (mode === "chat") {
    try {
      await closeStaleSessions(30);
      chatSessionId = await ensureChatSession(body.sessionId);
      const latestUserMessage = [...userMessages].reverse().find((message) => message.role === "user");
      if (latestUserMessage?.content) {
        await saveChatMessage({
          sessionId: chatSessionId,
          role: "user",
          content: latestUserMessage.content,
          metadata: {
            model: CHAT_MODEL,
            stream_requested: stream,
          },
        });
      }

      // Always send recent persisted history to the model so Telegram chat keeps context.
      const historyMessages = await loadRecentChatMessages(chatSessionId, 12);
      if (historyMessages.length > 0) {
        userMessages = historyMessages;
      }
    } catch (error) {
      console.error("Chat persistence warning:", error);
    }
  }

  let systemPrompt = baseSystemPrompt;
  if (mode === "chat") {
    const latestUserMessage = [...userMessages].reverse().find((message) => message.role === "user")?.content || "";
    if (latestUserMessage) {
      const knowledgeChunks = await retrieveKnowledge(latestUserMessage, 4);
      retrievedChunksCount = knowledgeChunks.length;
      if (knowledgeChunks.length > 0) {
        const context = renderKnowledgeContext(knowledgeChunks);
        systemPrompt = `${baseSystemPrompt}

Используй базу знаний ниже как главный источник фактов о клинике.
Не придумывай услуги, цены, условия или контакты, которых нет в контексте.
Если точного ответа нет в контексте, прямо скажи, что уточнишь у специалиста и предложи созвон с врачом.

КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:
${context}`;
      } else {
        systemPrompt = `${baseSystemPrompt}

Контекст базы знаний по этому вопросу не найден.
Не выдумывай детали о клинике. Честно сообщи, что уточнишь информацию у специалиста и предложи связать с врачом.`;
      }
    }
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
      let assistantContent = "";
      let streamedChunkCount = 0;

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
                  assistantContent += token;
                  streamedChunkCount += 1;
                  controller.enqueue(encoder.encode(token));
                }
              }
            }

            if (chatSessionId && assistantContent) {
              try {
                await saveChatMessage({
                  sessionId: chatSessionId,
                  role: "assistant",
                  content: assistantContent,
                  metadata: {
                    model: CHAT_MODEL,
                    stream: true,
                    streamed_chunks: streamedChunkCount,
                    latency_ms: Date.now() - requestStartedAt,
                    retrieved_chunks_count: retrievedChunksCount,
                  },
                });
              } catch (error) {
                console.error("Chat persistence warning:", error);
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
          "X-Session-Id": chatSessionId,
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
    if (mode === "chat" && chatSessionId && content) {
      try {
        await saveChatMessage({
          sessionId: chatSessionId,
          role: "assistant",
          content,
          metadata: {
            model: CHAT_MODEL,
            stream: false,
            latency_ms: Date.now() - requestStartedAt,
            retrieved_chunks_count: retrievedChunksCount,
          },
        });
      } catch (error) {
        console.error("Chat persistence warning:", error);
      }
    }

    return NextResponse.json({ reply: content, sessionId: chatSessionId || undefined });
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

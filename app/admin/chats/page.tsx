import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  status: string;
  source: string;
  last_activity_at: string;
  created_at: string;
};

type MessageRow = {
  session_id: string;
  role: string;
  content: string;
  created_at: string;
};

async function getData() {
  const supabase = createSupabaseServerClient();
  const { data: sessions, error: sessionsError } = await supabase
    .from("chat_sessions_demo")
    .select("id,status,source,last_activity_at,created_at")
    .order("last_activity_at", { ascending: false })
    .limit(30);

  if (sessionsError) return { sessions: [] as SessionRow[], messages: [] as MessageRow[] };

  const sessionIds = ((sessions || []) as SessionRow[]).map((item) => item.id);
  let messages: MessageRow[] = [];
  if (sessionIds.length) {
    const { data: rows, error: messagesError } = await supabase
      .from("chat_messages_demo")
      .select("session_id,role,content,created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false });

    if (messagesError) return { sessions: (sessions || []) as SessionRow[], messages: [] as MessageRow[] };
    messages = (rows || []) as MessageRow[];
  }

  return { sessions: (sessions || []) as SessionRow[], messages };
}

type AdminChatsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickToken(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default async function AdminChatsPage({ searchParams }: AdminChatsPageProps) {
  const adminToken = process.env.ADMIN_TOKEN;
  const resolvedSearchParams = (await searchParams) || {};
  const queryToken = pickToken(resolvedSearchParams.token);
  const headerToken = (await headers()).get("x-admin-token") || "";

  if (!adminToken || (queryToken !== adminToken && headerToken !== adminToken)) {
    notFound();
  }

  const { sessions, messages } = await getData();
  const grouped = new Map<string, MessageRow[]>();
  for (const message of messages) {
    const bucket = grouped.get(message.session_id) || [];
    bucket.push(message);
    grouped.set(message.session_id, bucket);
  }

  return (
    <main className="container-x py-10">
      <h1 className="text-2xl font-semibold">История чатов Милы</h1>
      <p className="mt-2 text-sm text-muted">
        Сессии автоматически закрываются после 30 минут неактивности. Эта страница только для внутренней проверки.
      </p>

      <div className="mt-6 space-y-4">
        {sessions.map((session) => {
          const rows = grouped.get(session.id) || [];
          return (
            <section key={session.id} className="rounded-xl border border-outline bg-surface-container p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  <strong>ID:</strong> {session.id}
                </p>
                <p className="text-sm">
                  <strong>Статус:</strong>{" "}
                  <span className={session.status === "active" ? "text-success" : "text-muted"}>{session.status}</span>
                </p>
              </div>
              <p className="mt-1 text-xs text-muted">
                source: {session.source} | created: {new Date(session.created_at).toLocaleString("ru-RU")} | last activity:{" "}
                {new Date(session.last_activity_at).toLocaleString("ru-RU")}
              </p>

              <div className="mt-4 space-y-2">
                {rows.length ? (
                  rows.slice(0, 8).map((message, index) => (
                    <div key={`${message.created_at}-${index}`} className="rounded-lg bg-background/70 p-3 text-sm">
                      <p className="mb-1 text-xs text-muted">
                        {message.role} · {new Date(message.created_at).toLocaleTimeString("ru-RU")}
                      </p>
                      <p>{message.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">Сообщений пока нет.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

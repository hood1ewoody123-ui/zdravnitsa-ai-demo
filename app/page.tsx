import { Activity, MessageCircleHeart, Stethoscope } from "lucide-react";
import { ChatWidget } from "@/features/chat/chat-widget";
import { InterceptForm } from "@/features/intercept/intercept-form";

function Header() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return (
    <header className="sticky top-0 z-20 border-b border-outline bg-[#0f1118]/85 backdrop-blur-md">
      <div className="container-x flex min-h-16 items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 font-semibold tracking-tight">
          <Stethoscope className="h-4 w-4 text-primary" />
          <span>Здравница AI</span>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
          <span>Система активна</span>
          <time>{`${hh}:${mm}`}</time>
        </div>
      </div>
    </header>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-12 md:py-14">
          <div className="container-x text-center">
            <h1 className="mx-auto max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              Автоматизация входящих заявок для клиники
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm text-muted md:text-base">
              ИИ-перехват, протоколист звонков и чат-консультант на одной странице
            </p>
            <div className="mt-8">
              <InterceptForm />
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="container-x grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-elev-2">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold">
                <Activity className="h-5 w-5 text-primary" />
                Агент-протоколист
              </h2>
              <p className="mt-3 text-sm text-muted">
                Секция переносится в Next-этапе: загрузка аудио, транскрипт, структурированное резюме и PDF.
              </p>
            </div>
            <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-elev-2">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold">
                <MessageCircleHeart className="h-5 w-5 text-primary" />
                Чат Мила
              </h2>
              <p className="mt-3 text-sm text-muted">
                Виджет чата будет перенесен следующим шагом после финализации перехвата на Next.
              </p>
            </div>
          </div>
        </section>
      </main>
      <ChatWidget />
    </>
  );
}

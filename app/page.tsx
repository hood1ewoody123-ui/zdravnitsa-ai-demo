import { Brain, MessageCircleHeart, ShieldCheck, Stethoscope } from "lucide-react";
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
              Демо с двумя рабочими сценариями: ИИ-перехват заявок и чат-консультант Мила
            </p>
            <div className="mt-8">
              <InterceptForm />
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="container-x space-y-5">
            <div className="rounded-2xl border border-outline bg-surface-container p-6 shadow-elev-2">
              <h2 className="text-xl font-semibold md:text-2xl">О демо-версии Здравница AI</h2>
              <p className="mt-3 max-w-4xl text-sm text-muted md:text-base">
                Текущая версия сфокусирована на быстрых точках пользы: мгновенный перехват входящих обращений с переводом в
                Telegram и живой диалог с Милой, которая ведет человека к разговору со специалистом. Сценарии выстроены так,
                чтобы менеджер видел обращение сразу, а клиент получал ориентир и продолжал общение в одном канале.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <article className="rounded-xl border border-outline/70 bg-background/40 p-4">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold md:text-base">
                    <Brain className="h-4 w-4 text-primary" />
                    ИИ-перехват
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Форма на лендинге, ответ Милы, автопереход в Telegram и отправка персонального PDF-ориентира.
                  </p>
                </article>
                <article className="rounded-xl border border-outline/70 bg-background/40 p-4">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold md:text-base">
                    <MessageCircleHeart className="h-4 w-4 text-primary" />
                    Чат Мила
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Контекстный чат с памятью по сессии и мягкой маршрутизацией к записи или звонку со специалистом.
                  </p>
                </article>
                <article className="rounded-xl border border-outline/70 bg-background/40 p-4">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold md:text-base">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Внутренний контроль
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Для команды доступна защищенная внутренняя страница мониторинга истории чатов и сессий.
                  </p>
                </article>
              </div>
            </div>

            <div className="rounded-xl border border-outline bg-surface-container p-6 shadow-elev-2">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold">
                <MessageCircleHeart className="h-5 w-5 text-primary" />
                Липкий чат-консультант Мила
              </h2>
              <p className="mt-3 text-sm text-muted">
                Виджет закреплен в интерфейсе и доступен на любом экране: пользователь может сразу продолжить диалог без
                возврата к форме.
              </p>
            </div>
          </div>
        </section>
      </main>
      <ChatWidget />
    </>
  );
}

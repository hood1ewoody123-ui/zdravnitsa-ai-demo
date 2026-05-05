# Migration TODO: Vanilla -> Next.js

## Goal
- Быстро мигрировать демо на Next.js без потери текущего бизнес-флоу: `перехват -> Telegram`, `протоколист`, `чат`.
- Зафиксировать каноничный стек: Tailwind CSS, Lucide React, Framer Motion, Zod + React Hook Form, Zustand, Radix UI (shadcn-style primitives).

## Target stack
- Framework: `next` (App Router, TypeScript).
- Styling: `tailwindcss`, `tailwind-merge`, `clsx`, `class-variance-authority`.
- Icons: `lucide-react`.
- Animation: `framer-motion`.
- Forms: `react-hook-form`, `@hookform/resolvers`, `zod`.
- State: `zustand`.
- UI primitives: `@radix-ui/react-*` (только нужные).
- AI/backend: Next Route Handlers (`app/api/*`) + OpenRouter.

## Migration strategy (fast + safe)
- Не переписывать все сразу: сначала поднять каркас Next и перенести перехват end-to-end.
- Старые файлы `index.html/style.css/app.js` оставить как reference до завершения миграции.
- После переноса перехвата удалить legacy-слой и продолжить с протоколистом/чатом уже только в Next.

## Detailed TODO

### 0) Bootstrap Next app
- [ ] Инициализировать Next.js с TypeScript и App Router.
- [ ] Подключить Tailwind CSS.
- [ ] Настроить алиасы импортов (`@/`).
- [ ] Создать базовые папки: `app`, `components`, `lib`, `store`, `features`.

### 1) Design system foundation
- [ ] Перенести токены в Tailwind theme (`tailwind.config.ts`): color roles, spacing, radius, shadows, motion.
- [ ] Добавить util-функцию `cn` (`clsx` + `tailwind-merge`).
- [ ] Создать базовые UI-компоненты на Radix/shadcn-style:
  - [ ] `Button`
  - [ ] `Input`
  - [ ] `Textarea`
  - [ ] `Card`
  - [ ] `Badge`
  - [ ] `Dialog` (для отправки PDF клиенту позже)

### 2) Layout and page shell
- [ ] Перенести шапку, hero и секции в `app/page.tsx`.
- [ ] Иконки заменить на Lucide.
- [ ] Микроанимации и transitions перевести на Framer Motion (не over-animate).

### 3) Intercept feature (priority)
- [ ] Создать feature-папку `features/intercept`.
- [ ] Описать схему формы на Zod.
- [ ] Подключить React Hook Form + zodResolver.
- [ ] Реализовать masked phone input (формат `+7 (999) 123-45-67`).
- [ ] Подключить API-вызов `POST /api/chat` (`mode=intercept`).
- [ ] Подключить webhook вызов `POST /api/intercept-notify`.
- [ ] UI states: loading, success, error, retry.
- [ ] Глобальный UI state (минимально) вынести в Zustand.

### 4) API migration to Next route handlers
- [ ] Перенести `api/chat.js` -> `app/api/chat/route.ts`.
- [ ] Перенести `api/whisper.js` -> `app/api/whisper/route.ts`.
- [ ] Перенести `api/intercept-notify.js` -> `app/api/intercept-notify/route.ts`.
- [ ] Унифицировать обработку ошибок и ответов.

### 5) Protocolist migration
- [ ] Перенести upload и шаги прогресса в `features/protocol`.
- [ ] Подключить `whisper -> protocol json`.
- [ ] Восстановить PDF flow.
- [ ] Подключить n8n protocol webhook.

### 6) Chat widget migration
- [ ] Перенести виджет в `features/chat`.
- [ ] Подключить streaming ответов через `/api/chat`.
- [ ] Контроль UX после 3-го сообщения (CTA на контакт).

### 7) Cleanup + hardening
- [ ] Удалить legacy `index.html/style.css/app.js` после parity check.
- [ ] Обновить `.env.example` и docs.
- [ ] Проверить end-to-end сценарий 17-минутной демки.

## Risks and nuances for our context
- Не тянуть тяжелые UI-библиотеки целиком; Radix только точечно.
- Сразу держать медицинские ограничения в промптах и UI copy.
- Для демо важнее predictability, чем «идеальная архитектура» — не переусложнять.
- Приоритет интеграции перехвата выше визуальной полировки.

## Definition of done (migration phase)
- Перехват полностью работает в Next end-to-end (AI + Telegram webhook).
- Протоколист и чат перенесены без регрессий по ключевому сценарию.
- Старый Vanilla слой удален.

# Architecture Spec

## Project layout

```txt
zdravnitsa-demo/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── api/
│       ├── chat/route.ts
│       ├── whisper/route.ts
│       └── intercept-notify/route.ts
├── components/
│   └── ui/
├── features/
│   ├── intercept/
│   ├── protocol/
│   └── chat/
├── lib/
├── store/
├── .env
├── .env.example
├── package.json
└── tailwind.config.ts
```

## Runtime boundaries
- UI code lives in React components (`app/`, `components/`, `features/`).
- Server logic lives in route handlers (`app/api/*/route.ts`).
- External AI calls are allowed only from route handlers.

## Environment variables

```env
OPENROUTER_API_KEY=sk-or-...
N8N_WEBHOOK_INTERCEPT=https://.../webhook/intercept
N8N_WEBHOOK_PROTOCOL=https://.../webhook/protocol
```

## Demo flows

### 1) Intercept — канон сценария (зафиксировано)

Цель демо: сильный перехват без «врачебного PDF»: сразу эмпатия в Telegram, затем брендированный ориентир файлом.

**Последовательность**

1. Пользователь заполняет форму в hero (`features/intercept`): имя, телефон, ситуация.
2. Клиент: `/api/chat` (`mode: intercept`) → короткий текст Милы для заявки.
3. Клиент: `/api/intercept-notify` → запись лида в Supabase (`intercept_leads_demo`), затем `POST` в `N8N_WEBHOOK_INTERCEPT` с полями как минимум: `name`, `phone`, `situation`, `agent_reply`, `lead_id`, `delivery_channel: telegram`, `timestamp`.
4. При успешном ответе API (HTTP 200 и есть `lead_id`) — редирект в Telegram-бота: `https://t.me/<NEXT_PUBLIC_TELEGRAM_INTERCEPT_BOT>?start=<lead_id>` (deep link).

**Сообщения бота (два шага, не один)**

- **Сообщение 1 (сразу после входа в чат / `/start`):** приветствие по имени, узнаваемая отсылка к тексту из поля «ситуация», тон тёплый. Один мягкий следующий шаг (вопрос или приглашение к короткому уточнению). Без ожидания PDF и без формулировок «врачебная консультация в документе».
- **Сообщение 2 (когда PDF готов, типично через десятки секунд):** короткий текст «материал готов» + ссылка или вложение PDF. В подписи к файлу явно: это **ориентир для разговора со специалистом**, не диагноз и не план лечения; при сомнениях — к живому врачу.

**Границы ответственности**

- Next: форма, ИИ-черновик ответа, сохранение лида, вызов n8n, редирект в бота.
- n8n + бот: уведомление менеджера, отправка пользователю сообщения 1 и (асинхронно) сообщения 2 с PDF, генерация/хостинг PDF (канон реализации PDF выбирается отдельно: Storage, base64 в webhook, или генерация в n8n).

**Техническая дорожная карта (не смешивать с протоколистом)**

- Таблица `intercept_leads_demo` хранит заявку и статус webhook; отдельная колонка под URL PDF **не обязательна**, пока ссылка уходит пользователю из бота. Если нужен аудит — добавляют поле вроде `client_pdf_url` отдельной миграцией и пишут его из n8n после выкладки файла.

### 2) Protocol
`features/protocol` -> `/api/whisper` -> transcript -> `/api/chat` (mode: `protocol`) -> JSON summary -> PDF preview -> `N8N_WEBHOOK_PROTOCOL`.

### 3) Chat Mila
Widget in `features/chat` -> `/api/chat` (mode: `chat`, with history) -> streaming response in UI.

## Security rules
- Do not expose secrets in HTML/CSS/JS shipped to browser.
- Do not store user data persistently in demo mode.
- Keep network paths explicit and minimal.

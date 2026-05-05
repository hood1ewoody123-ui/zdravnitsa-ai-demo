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

### 1) Intercept
`features/intercept` -> `/api/chat` (mode: `intercept`) -> OpenRouter Claude -> UI card -> `/api/intercept-notify` -> `N8N_WEBHOOK_INTERCEPT`.

### 2) Protocol
`features/protocol` -> `/api/whisper` -> transcript -> `/api/chat` (mode: `protocol`) -> JSON summary -> PDF preview -> `N8N_WEBHOOK_PROTOCOL`.

### 3) Chat Mila
Widget in `features/chat` -> `/api/chat` (mode: `chat`, with history) -> streaming response in UI.

## Security rules
- Do not expose secrets in HTML/CSS/JS shipped to browser.
- Do not store user data persistently in demo mode.
- Keep network paths explicit and minimal.

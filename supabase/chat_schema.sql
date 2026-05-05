-- Chat persistence + RAG knowledge base schema
create extension if not exists "pgcrypto";

create table if not exists public.chat_sessions_demo (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'widget',
  visitor_fingerprint text,
  contact_phone text,
  status text not null default 'active',
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.chat_sessions_demo
  add column if not exists last_activity_at timestamptz not null default now();

create table if not exists public.chat_messages_demo (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions_demo(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_demo_session_created_idx
  on public.chat_messages_demo(session_id, created_at);

create index if not exists chat_sessions_demo_status_activity_idx
  on public.chat_sessions_demo(status, last_activity_at);

create table if not exists public.knowledge_chunks_demo (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  title text,
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_demo_source_idx
  on public.knowledge_chunks_demo(source_url);

create table if not exists public.intercept_leads_demo (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  situation text not null,
  agent_reply text not null,
  source text not null default 'landing_intercept',
  webhook_status text not null default 'pending',
  delivery_channel text not null default 'whatsapp',
  telegram_username text,
  webhook_response text,
  created_at timestamptz not null default now()
);

alter table public.intercept_leads_demo
  add column if not exists delivery_channel text not null default 'whatsapp';

alter table public.intercept_leads_demo
  add column if not exists telegram_username text;

create index if not exists intercept_leads_demo_created_idx
  on public.intercept_leads_demo(created_at desc);

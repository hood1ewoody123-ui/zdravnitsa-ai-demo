-- Chat persistence + RAG knowledge base schema
create extension if not exists "pgcrypto";

create table if not exists public.chat_sessions_demo (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'widget',
  visitor_fingerprint text,
  contact_phone text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

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

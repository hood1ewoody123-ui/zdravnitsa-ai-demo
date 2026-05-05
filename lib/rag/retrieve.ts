import { createSupabaseServerClient } from "@/lib/supabase/server";

type KnowledgeChunk = {
  source_url: string;
  title: string | null;
  content: string;
  tags: string[] | null;
};

function tokenizeQuery(query: string) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .slice(0, 8);
}

function scoreChunk(chunk: KnowledgeChunk, terms: string[]) {
  const haystack = `${chunk.title || ""} ${chunk.content} ${(chunk.tags || []).join(" ")}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export async function retrieveKnowledge(query: string, limit = 4) {
  const terms = tokenizeQuery(query);
  if (!terms.length) return [];

  const orClause = terms
    .slice(0, 4)
    .map((term) => `content.ilike.%${term}%,title.ilike.%${term}%`)
    .join(",");

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("knowledge_chunks_demo")
    .select("source_url,title,content,tags")
    .or(orClause)
    .limit(40);

  if (error || !data) return [];

  const ranked = (data as KnowledgeChunk[])
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Avoid repetitive context by limiting chunks from same source/title bucket.
  const bucketCounts = new Map<string, number>();
  const selected: KnowledgeChunk[] = [];
  for (const item of ranked) {
    const bucketKey = `${item.chunk.source_url}::${item.chunk.title || ""}`;
    const current = bucketCounts.get(bucketKey) || 0;
    if (current >= 2) continue;

    selected.push(item.chunk);
    bucketCounts.set(bucketKey, current + 1);
    if (selected.length >= limit) break;
  }

  return selected;
}

export function renderKnowledgeContext(chunks: KnowledgeChunk[]) {
  if (!chunks.length) return "";

  return chunks
    .map((chunk, index) => {
      const short = chunk.content.replace(/\s+/g, " ").trim().slice(0, 700);
      const label = chunk.title ? `${chunk.title}` : chunk.source_url;
      return `[${index + 1}] ${label}\nИсточник: ${chunk.source_url}\n${short}`;
    })
    .join("\n\n");
}

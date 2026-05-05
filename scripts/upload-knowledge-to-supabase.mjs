import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SOURCE_PATH = "docs/knowledge-rag-clean.txt";
const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 220;

function getEnvAny(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`${names.join(" or ")} is not configured`);
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let cursor = 0;
  while (cursor < text.length) {
    const end = Math.min(cursor + size, text.length);
    chunks.push(text.slice(cursor, end));
    if (end >= text.length) break;
    cursor = Math.max(0, end - overlap);
  }
  return chunks;
}

async function run() {
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(`${SOURCE_PATH} not found`);
  }

  const source = normalize(fs.readFileSync(SOURCE_PATH, "utf8"));
  if (source.length < 300) {
    throw new Error("Knowledge source text is too short");
  }

  const chunks = chunkText(source);
  const rows = chunks.map((content, index) => ({
    source_url: "manual://narcorehab-compiled",
    title: `knowledge_chunk_${index + 1}`,
    content,
    tags: ["narcorehab", "compiled", "manual-import"],
  }));

  const supabase = createClient(
    getEnvAny("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    getEnvAny("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error: deleteError } = await supabase
    .from("knowledge_chunks_demo")
    .delete()
    .eq("source_url", "manual://narcorehab-compiled");
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("knowledge_chunks_demo").insert(rows);
  if (insertError) throw insertError;

  console.log(`Uploaded ${rows.length} chunks to knowledge_chunks_demo.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

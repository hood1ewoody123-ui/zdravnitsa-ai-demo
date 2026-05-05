import { load } from "cheerio";
import { createClient } from "@supabase/supabase-js";

const START_URL = "https://narcorehab.com/";
const MAX_PAGES = 20;

function getEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getEnvAny(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`${names.join(" or ")} is not configured`);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function chunkText(text, chunkSize = 1200, overlap = 150) {
  const chunks = [];
  let cursor = 0;
  while (cursor < text.length) {
    const end = Math.min(cursor + chunkSize, text.length);
    chunks.push(text.slice(cursor, end));
    if (end >= text.length) break;
    cursor = Math.max(0, end - overlap);
  }
  return chunks;
}

function extractPageData(url, html) {
  const $ = load(html);
  $("script, style, noscript, svg, iframe, footer nav").remove();
  const title = normalizeWhitespace($("title").first().text()) || url;
  const text = normalizeWhitespace($("main").text() || $("body").text());

  const links = new Set();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const full = new URL(href, url).toString();
      if (full.startsWith("https://narcorehab.com/")) {
        links.add(full.split("#")[0]);
      }
    } catch {
      // ignore malformed links
    }
  });

  return { title, text, links: [...links] };
}

async function crawl() {
  const pages = [];
  const wpSources = [
    "https://narcorehab.com/wp-json/wp/v2/pages?per_page=100",
    "https://narcorehab.com/wp-json/wp/v2/posts?per_page=100",
  ];

  for (const source of wpSources) {
    try {
      const response = await fetch(source, {
        headers: { "User-Agent": "zdravnitsa-knowledge-ingest/1.0" },
      });
      if (!response.ok) continue;

      const items = await response.json();
      for (const item of items) {
        const htmlContent = `${item?.title?.rendered || ""}\n${item?.content?.rendered || ""}`;
        const cleaned = normalizeWhitespace(load(htmlContent).text());
        const pageUrl = item?.link || START_URL;

        if (cleaned.length < 220) continue;
        pages.push({
          url: pageUrl,
          title: normalizeWhitespace(load(item?.title?.rendered || "").text()) || pageUrl,
          text: cleaned,
        });

        if (pages.length >= MAX_PAGES) break;
      }
    } catch {
      // fallback to html crawl below
    }
    if (pages.length >= MAX_PAGES) break;
  }

  if (!pages.length) {
    const queue = [START_URL];
    const visited = new Set();
    while (queue.length && pages.length < MAX_PAGES) {
      const url = queue.shift();
      if (!url || visited.has(url)) continue;
      visited.add(url);

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "zdravnitsa-knowledge-ingest/1.0" },
        });
        if (!response.ok) continue;
        const html = await response.text();
        const data = extractPageData(url, html);
        if (data.text.length < 300) continue;

        pages.push({ url, title: data.title, text: data.text });
        for (const link of data.links) {
          if (!visited.has(link) && queue.length < 80) queue.push(link);
        }
      } catch {
        // ignore unreachable pages
      }
    }
  }

  return pages;
}

async function ingest() {
  const supabase = createClient(
    getEnvAny("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const pages = await crawl();
  if (!pages.length) {
    console.log("No pages crawled");
    return;
  }

  const rows = [];
  for (const page of pages) {
    const pageChunks = chunkText(page.text);
    for (const chunk of pageChunks) {
      rows.push({
        source_url: page.url,
        title: page.title,
        content: chunk,
        tags: ["narcorehab", "site"],
      });
    }
  }

  const { error: deleteError } = await supabase
    .from("knowledge_chunks_demo")
    .delete()
    .in("source_url", pages.map((page) => page.url));
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("knowledge_chunks_demo").insert(rows);
  if (insertError) throw insertError;

  console.log(`Ingested ${rows.length} chunks from ${pages.length} pages.`);
}

ingest().catch((error) => {
  console.error(error);
  process.exit(1);
});

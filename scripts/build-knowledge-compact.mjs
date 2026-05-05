import fs from "node:fs";

const SOURCE_PATHS = ["docs/knowledge-rag-clean.txt", "docs/knowledge-system-prompt-oneline.txt"];
const OUTPUT_PATH = "docs/knowledge-system-prompt-compact.txt";
const OUTPUT_RAG_PATH = "docs/knowledge-rag-clean.txt";

const PRIORITY_KEYWORDS = [
  "здравница",
  "лечение",
  "алкогол",
  "наркоман",
  "реабилитац",
  "вывод из запоя",
  "кодирован",
  "детокс",
  "на дому",
  "круглосуточ",
  "аноним",
  "врач",
  "консультац",
  "контак",
  "москва",
  "кутузов",
  "88003006103",
  "84955324403",
];

const NOISE_PATTERNS = [
  /политик[аеи]\s+конфиденциальности/gi,
  /согласи[ея]\s+на\s+обработк/gi,
  /соглашаюсь\s+на\s+получение\s+смс/gi,
  /благодарим\s+за\s+доверие/gi,
  /ваша\s+заявка\s+зафиксирована/gi,
  /получить\s+консультацию/gi,
  /заказать\s+звонок/gi,
  /перезагрузите\s+страницу/gi,
  /реабилитация,\s+представленная\s+на\s+сайте/gi,
  /в\s+самое\s+ближайшее\s+время/gi,
];

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function removeNoise(text) {
  return NOISE_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, " "), text);
}

function dedupeSentences(sentences) {
  const seen = new Set();
  const result = [];
  for (const sentence of sentences) {
    const key = sentence.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (key.length < 20) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(sentence.trim());
  }
  return result;
}

function scoreSentence(sentence) {
  const lower = sentence.toLowerCase();
  return PRIORITY_KEYWORDS.reduce((score, keyword) => score + (lower.includes(keyword) ? 2 : 0), 0);
}

function run() {
  const sourcePath = SOURCE_PATHS.find((filePath) => fs.existsSync(filePath));
  if (!sourcePath) {
    throw new Error(`${SOURCE_PATHS.join(" or ")} not found`);
  }

  const source = normalize(removeNoise(fs.readFileSync(sourcePath, "utf8")));
  const rawSentences = source
    .split(/(?<=[.!?])\s+/)
    .map((line) => normalize(line))
    .filter((line) => line.length >= 40 && line.length <= 350);

  const unique = dedupeSentences(rawSentences);
  const ranked = unique
    .map((sentence) => ({ sentence, score: scoreSentence(sentence) }))
    .sort((a, b) => b.score - a.score);

  const selected = [];
  let totalLength = 0;
  const maxChars = 6500;
  for (const item of ranked) {
    if (item.score === 0) continue;
    if (totalLength + item.sentence.length + 1 > maxChars) continue;
    selected.push(item.sentence);
    totalLength += item.sentence.length + 1;
    if (selected.length >= 42) break;
  }

  const compact = normalize(selected.join(" "));

  // Wider but still cleaned text for RAG store.
  const ragSelected = [];
  let ragLength = 0;
  const ragMaxChars = 45000;
  for (const item of ranked) {
    if (item.score === 0) continue;
    if (ragLength + item.sentence.length + 1 > ragMaxChars) continue;
    ragSelected.push(item.sentence);
    ragLength += item.sentence.length + 1;
    if (ragSelected.length >= 260) break;
  }
  const ragClean = normalize(ragSelected.join(" "));

  fs.writeFileSync(OUTPUT_PATH, compact, "utf8");
  fs.writeFileSync(OUTPUT_RAG_PATH, ragClean, "utf8");
  console.log(`Saved ${OUTPUT_PATH} (${compact.length} chars, ${selected.length} sentences)`);
  console.log(`Saved ${OUTPUT_RAG_PATH} (${ragClean.length} chars, ${ragSelected.length} sentences)`);
}

run();

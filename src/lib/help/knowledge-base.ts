import fs from "node:fs";
import path from "node:path";

export type KnowledgeChunk = {
  id: string;
  title: string;
  content: string;
};

let cachedChunks: KnowledgeChunk[] | null = null;

function knowledgeDir() {
  return path.join(process.cwd(), "content/help-knowledge");
}

function parseMarkdownFile(filePath: string, fileName: string): KnowledgeChunk[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? fileName.replace(/\.md$/, "");
  const body = raw.replace(/^#\s+.+$/m, "").trim();
  if (!body) {
    return [{ id: fileName, title, content: title }];
  }

  const sections = body.split(/\n(?=##\s+)/);
  if (sections.length <= 1) {
    return [{ id: fileName, title, content: body }];
  }

  return sections.map((section, index) => {
    const heading = section.match(/^##\s+(.+)/)?.[1]?.trim();
    return {
      id: `${fileName}:${index}`,
      title: heading ? `${title} — ${heading}` : title,
      content: section.replace(/^##\s+.+/, "").trim() || section.trim()
    };
  });
}

export function loadKnowledgeChunks(): KnowledgeChunk[] {
  if (cachedChunks) return cachedChunks;

  const dir = knowledgeDir();
  if (!fs.existsSync(dir)) {
    cachedChunks = [];
    return cachedChunks;
  }

  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort();

  cachedChunks = files.flatMap((fileName) =>
    parseMarkdownFile(path.join(dir, fileName), fileName)
  );
  return cachedChunks;
}

function scoreChunk(chunk: KnowledgeChunk, terms: string[]) {
  const haystack = `${chunk.title} ${chunk.content}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (haystack.includes(term)) score += 2;
    const words = term.split(/\s+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (haystack.includes(word)) score += 1;
    }
  }
  return score;
}

export function searchKnowledge(query: string, limit = 4): KnowledgeChunk[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 1);

  const chunks = loadKnowledgeChunks();
  if (!terms.length) {
    return chunks.slice(0, limit);
  }

  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.chunk);
}

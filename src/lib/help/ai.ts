import { searchKnowledge, type KnowledgeChunk } from "@/lib/help/knowledge-base";

function formatContext(chunks: KnowledgeChunk[]) {
  if (!chunks.length) return "No help articles matched.";
  return chunks
    .map((chunk) => `### ${chunk.title}\n${chunk.content}`)
    .join("\n\n");
}

async function callOpenAi(question: string, context: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are Kickboard Help, a concise assistant for the Kickboard World Cup fan app. Answer only using the provided knowledge base excerpts. If the answer is not in the excerpts, say you are not sure and suggest the user ask an admin via Help → Ask admin. Keep answers under 120 words. Do not invent features."
        },
        {
          role: "user",
          content: `Knowledge base:\n${context}\n\nUser question: ${question}`
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OPENAI_ERROR:${response.status}:${text.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  return text || null;
}

function fallbackFromChunks(question: string, chunks: KnowledgeChunk[]) {
  if (!chunks.length) {
    return {
      reply:
        "I could not find anything in the help guides about that. Try rephrasing, or use **Ask admin** in Help for account-specific questions.",
      sources: [] as string[]
    };
  }

  const summary = chunks
    .map((chunk) => `**${chunk.title}** — ${chunk.content.split("\n")[0]?.slice(0, 160) ?? ""}`)
    .join("\n\n");

  return {
    reply: `Here is what the Kickboard guides say:\n\n${summary}\n\nAsk a follow-up or switch to **Ask admin** if you need personal account help.`,
    sources: chunks.map((chunk) => chunk.title)
  };
}

export async function generateAiHelpReply(question: string) {
  const chunks = searchKnowledge(question, 5);
  const context = formatContext(chunks);
  const sources = chunks.map((chunk) => chunk.title);

  try {
    const aiText = await callOpenAi(question, context);
    if (aiText) {
      return { reply: aiText, sources, usedLlm: true };
    }
  } catch (error) {
    console.error("[help-ai]", error);
  }

  const fallback = fallbackFromChunks(question, chunks);
  return { ...fallback, usedLlm: false };
}

export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

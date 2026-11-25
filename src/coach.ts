import type { Book } from "./books";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CoachConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function structureToText(book: Book): string {
  const lines = book.structure.units.map((u) => {
    const steps = u.steps
      .map((s) => `${s.level}. ${s.name}${s.nameEn ? ` (${s.nameEn})` : ""}${s.summary ? ` — ${s.summary}` : ""}`)
      .join("\n    ");
    return `- ${u.name}${u.nameEn ? ` (${u.nameEn})` : ""}${u.focus ? ` · 针对 ${u.focus}` : ""}:\n    ${steps}`;
  });
  return lines.join("\n");
}

export function buildSystemPrompt(book: Book): string {
  const c = book.coach;
  const rules = c.rules.map((r) => `- ${r}`).join("\n");
  return [
    `你是《${book.title}》${book.titleEn ? `(${book.titleEn})` : ""}的化身「${c.name}」。`,
    `角色:${c.persona}`,
    `口吻:${c.tone ?? "自然、亲切"}`,
    `互动规则:\n${rules}`,
    `本书结构(对话时引用具体单元与等级):\n${structureToText(book)}`,
  ].join("\n\n");
}

export async function* streamChat(
  book: Book,
  messages: ChatMessage[],
  cfg: CoachConfig,
): AsyncGenerator<string> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      stream: true,
      messages: [{ role: "system", content: buildSystemPrompt(book) }, ...messages],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LLM API ${res.status}: ${t.slice(0, 300)}`);
  }
  if (!res.body) throw new Error("LLM API: empty body");
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop()!;
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith("data:")) continue;
      const payload = s.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // 忽略非 JSON 的 SSE 行(如心跳)
      }
    }
  }
}

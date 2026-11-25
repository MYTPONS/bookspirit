import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadBook, listBooks } from "./books";
import { streamChat, type ChatMessage } from "./coach";

const PUBLIC_DIR = join(import.meta.dir, "..", "public");
const PORT = Number(process.env.PORT ?? 3000);
const cfg = {
  baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY ?? "",
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
};

function serveFile(name: string): Response {
  const file = join(PUBLIC_DIR, name);
  if (!existsSync(file)) return new Response("Not Found", { status: 404 });
  return new Response(Bun.file(file));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "GET") {
      if (path === "/") return serveFile("index.html");
      if (path === "/chat") return serveFile("chat.html");
      if (path === "/ui.css") return serveFile("ui.css");
      if (path === "/app.js") return serveFile("app.js");
      if (path === "/chat.js") return serveFile("chat.js");
      if (path === "/api/books") return json(listBooks());
      const m = path.match(/^\/api\/books\/([^/]+)$/);
      if (m) {
        try {
          return json(loadBook(m[1]));
        } catch (e) {
          return json({ error: (e as Error).message }, 404);
        }
      }
      return new Response("Not Found", { status: 404 });
    }

    if (req.method === "POST" && path === "/api/chat") {
      if (!cfg.apiKey) {
        return json({ error: "OPENAI_API_KEY 未配置,请复制 .env.example 为 .env 并填写后重启" }, 503);
      }
      let body: { book: string; messages: ChatMessage[] };
      try {
        body = (await req.json()) as { book: string; messages: ChatMessage[] };
      } catch {
        return json({ error: "invalid JSON body" }, 400);
      }
      if (!body.book || !Array.isArray(body.messages) || body.messages.length === 0) {
        return json({ error: "body 需要 book 与非空 messages" }, 400);
      }
      let book;
      try {
        book = loadBook(body.book);
      } catch (e) {
        return json({ error: (e as Error).message }, 404);
      }
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const delta of streamChat(book, body.messages, cfg)) {
              controller.enqueue(`data: ${JSON.stringify({ delta })}\n\n`);
            }
            controller.enqueue(`data: ${JSON.stringify({ done: true })}\n\n`);
          } catch (e) {
            controller.enqueue(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`);
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`bookspirit 已启动:http://localhost:${PORT} (模型 ${cfg.model})`);

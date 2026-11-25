const book = new URLSearchParams(location.search).get("book") || "convict-conditioning";
const thread = document.getElementById("thread");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const md = (s) => {
  const esc = escapeHtml(s);
  const inline = esc
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const lines = inline.split("\n");
  let out = "";
  let inList = false;
  for (const line of lines) {
    const m = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (m) {
      if (!inList) {
        out += "<ul>";
        inList = true;
      }
      out += `<li>${m[2]}</li>`;
    } else {
      if (inList) {
        out += "</ul>";
        inList = false;
      }
      out += line ? `<p>${line}</p>` : "";
    }
  }
  if (inList) out += "</ul>";
  return out;
};

function addMessage(role, html) {
  const msg = document.createElement("div");
  msg.className = `chat-message ${role === "user" ? "msg-user" : "msg-assistant"}`;
  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.textContent = role === "user" ? "我" : "书";
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.innerHTML = html;
  msg.append(avatar, bubble);
  thread.appendChild(msg);
  thread.scrollTop = thread.scrollHeight;
  return bubble;
}

function collectMessages() {
  return [...thread.querySelectorAll(".chat-message")]
    .map((m) => ({
      role: m.classList.contains("msg-user") ? "user" : "assistant",
      content: m.querySelector(".chat-bubble").textContent,
    }));
}

async function ask() {
  const text = input.value.trim();
  if (!text || sendBtn.disabled) return;
  input.value = "";
  addMessage("user", md(text));
  const bubble = addMessage("assistant", '<p class="chat-meta">正在思考…</p>');
  const spinner = bubble.querySelector(".chat-meta");
  sendBtn.disabled = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book, messages: collectMessages() }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error ?? `HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        const s = line.trim();
        if (!s.startsWith("data:")) continue;
        let evt;
        try {
          evt = JSON.parse(s.slice(5).trim());
        } catch {
          continue;
        }
        if (evt.error) throw new Error(evt.error);
        if (evt.delta) {
          acc += evt.delta;
          spinner.remove();
          bubble.innerHTML = md(acc);
          thread.scrollTop = thread.scrollHeight;
        }
      }
    }
    if (!acc) spinner.textContent = "(化身没有回复)";
  } catch (e) {
    spinner.remove();
    bubble.innerHTML = `<p>${escapeHtml(e.message)}</p><p class="chat-meta">发送失败</p>`;
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

async function init() {
  const res = await fetch(`/api/books/${encodeURIComponent(book)}`);
  if (res.ok) {
    const b = await res.json();
    document.getElementById("book-title").textContent = `${b.title} · ${b.coach.name}`;
    document.getElementById("book-desc").textContent = b.subtitle ?? b.coverNote ?? "";
    addMessage(
      "assistant",
      `<p>我是《${escapeHtml(b.title)}》的化身「${escapeHtml(b.coach.name)}」。</p>
       <p>想聊什么都可以——比如"我完全没练过，该从哪一式开始？"或者"这本书到底在讲什么？"</p>`,
    );
  } else {
    document.getElementById("book-desc").textContent = "书模加载失败,先检查 books/ 目录。";
  }
}

sendBtn.addEventListener("click", ask);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    ask();
  }
});
init();

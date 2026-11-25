const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function render() {
  const shelf = document.getElementById("bookshelf");
  const res = await fetch("/api/books");
  if (!res.ok) {
    shelf.innerHTML = '<div class="empty"><p>书架加载失败。</p></div>';
    return;
  }
  const books = await res.json();
  if (books.length === 0) {
    shelf.innerHTML = '<div class="empty"><p>书架还是空的。在 <code>books/</code> 下加一个书模目录吧。</p></div>';
    return;
  }
  shelf.innerHTML = books
    .map(
      (b) => `
    <a class="card" href="/chat?book=${encodeURIComponent(b.id)}">
      <h3 class="card-title">${escapeHtml(b.title)}</h3>
      ${b.author ? `<p class="card-desc">${escapeHtml(b.author)}</p>` : ""}
      ${b.coverNote ? `<p class="card-desc">${escapeHtml(b.coverNote)}</p>` : ""}
    </a>`,
    )
    .join("");
}

render();

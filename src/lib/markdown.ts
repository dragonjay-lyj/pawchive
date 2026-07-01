// ============================================================
// Minimal Markdown renderer — deliberately tiny so we don't
// pull in a full parser for one-off announcement bodies.
// Supported: **bold**, *italic*, `inline code`, [text](url),
// - / * list bullets, ``` fenced code, > blockquote, blank
// line paragraphs, auto-linking of bare http(s):// URLs.
// Output is HTML with all user input escaped first.
// ============================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(escaped: string): string {
  let s = escaped;
  // Fenced-like inline `code`
  s = s.replace(/`([^`\n]+)`/g, (_m, code) => `<code class="rounded bg-surface-3 px-1 py-0.5 text-[11px] font-mono">${code}</code>`);
  // Bold **text**
  s = s.replace(/\*\*([^*\n]+)\*\*/g, `<strong>$1</strong>`);
  // Italic *text* or _text_
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, `$1<em>$2</em>`);
  s = s.replace(/(^|[^_\w])_([^_\n]+)_(?!_)/g, `$1<em>$2</em>`);
  // Markdown links [text](url) — url must already be escaped
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${text}</a>`;
  });
  // Bare http(s) URLs (avoid double-wrapping inside href="...")
  s = s.replace(/(^|[\s(])((https?:&#x2F;&#x2F;|https?:\/\/)[^\s<]+)/g, (_m, pre, url) => {
    const clean = url.replace(/[.,;:!?]+$/, "");
    return `${pre}<a href="${clean}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${clean}</a>`;
  });
  return s;
}

export function renderMarkdown(md: string): string {
  if (!md) return "";
  const escaped = escapeHtml(md);
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];

  let inCode = false;
  let codeBuf: string[] = [];
  let listBuf: string[] = [];
  let paraBuf: string[] = [];

  const flushList = () => {
    if (listBuf.length) {
      out.push(`<ul class="ml-4 list-disc space-y-0.5">${listBuf.join("")}</ul>`);
      listBuf = [];
    }
  };
  const flushPara = () => {
    if (paraBuf.length) {
      out.push(`<p>${renderInline(paraBuf.join(" "))}</p>`);
      paraBuf = [];
    }
  };

  for (const raw of lines) {
    if (inCode) {
      if (/^```/.test(raw)) {
        out.push(`<pre class="my-2 overflow-x-auto rounded-lg bg-surface-2 p-3 text-[11px] font-mono leading-relaxed"><code>${codeBuf.join("\n")}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        codeBuf.push(raw);
      }
      continue;
    }
    if (/^```/.test(raw)) {
      flushPara();
      flushList();
      inCode = true;
      continue;
    }
    if (!raw.trim()) {
      flushPara();
      flushList();
      continue;
    }
    // Blockquote
    const bq = raw.match(/^\s*&gt;\s?(.*)$/);
    if (bq) {
      flushPara();
      flushList();
      out.push(`<blockquote class="border-l-2 border-primary/40 pl-3 text-text-tertiary">${renderInline(bq[1])}</blockquote>`);
      continue;
    }
    // Bullet list item
    const li = raw.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      flushPara();
      listBuf.push(`<li>${renderInline(li[1])}</li>`);
      continue;
    }
    // Heading (support ## and ###)
    const h = raw.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      const lvl = h[1].length;
      const tag = lvl === 1 ? "h3" : lvl === 2 ? "h4" : "h5";
      out.push(`<${tag} class="font-display text-sm mt-2 mb-1">${renderInline(h[2])}</${tag}>`);
      continue;
    }
    // Paragraph line
    flushList();
    paraBuf.push(raw.trim());
  }
  // Flush trailing
  if (inCode && codeBuf.length) {
    out.push(`<pre class="my-2 overflow-x-auto rounded-lg bg-surface-2 p-3 text-[11px] font-mono leading-relaxed"><code>${codeBuf.join("\n")}</code></pre>`);
  }
  flushPara();
  flushList();

  return out.join("");
}

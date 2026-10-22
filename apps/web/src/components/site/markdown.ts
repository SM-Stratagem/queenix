/**
 * Blog markdown → HTML. Raw HTML in the source is escaped (shown as text,
 * never executed) and links/images only keep http(s), mailto, tel and
 * same-site URLs — so a post body can't inject script.
 */
import { Marked } from 'marked';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h;
  if (/^[/#?]/.test(h) && !h.startsWith('//')) return h;
  return null;
}

const md = new Marked({ gfm: true, async: false }).use({
  renderer: {
    html({ text }) {
      return esc(text);
    },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      const url = safeHref(href);
      if (!url) return inner;
      const ext = /^https?:/i.test(url) ? ' rel="noopener noreferrer" target="_blank"' : '';
      return `<a href="${esc(url)}"${title ? ` title="${esc(title)}"` : ''}${ext}>${inner}</a>`;
    },
    image({ href, text }) {
      const url = safeHref(href);
      if (!url) return esc(text);
      return `<img src="${esc(url)}" alt="${esc(text)}" loading="lazy" />`;
    },
  },
});

export function renderMarkdown(src: string): string {
  return md.parse(src) as string;
}

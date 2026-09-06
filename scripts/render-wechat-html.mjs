// Render a Markdown article into HTML that survives a paste into the WeChat
// Official Account editor.
//
// WeChat strips <style> blocks and class attributes but keeps inline styles, and
// external links are not clickable for readers who are not following the account.
// So this script does three things: inlines a style on every element, embeds local
// images as data URIs (so the paste carries them), and rewrites external links into
// numbered markers with a "参考资料" list at the end.
//
// Usage: node scripts/render-wechat-html.mjs docs/promo/wechat-article.md
import { fileURLToPath } from 'url';
import { Buffer } from 'node:buffer';
import path from 'path';
import fs from 'fs';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(process.cwd(), process.argv[2] || 'docs/promo/wechat-article.md');
const OUT = SRC.replace(/\.md$/, '.html');

const S = {
  h1: 'font-size:22px;font-weight:700;color:#0f172a;line-height:1.45;margin:0 0 10px;',
  h2: 'font-size:19px;font-weight:700;color:#1d4ed8;line-height:1.45;margin:36px 0 12px;padding-left:10px;border-left:4px solid #2563eb;',
  h3: 'font-size:17px;font-weight:700;color:#0f172a;margin:26px 0 8px;',
  p: 'font-size:16px;line-height:1.85;color:#3f3f3f;letter-spacing:0.04em;margin:0 0 18px;word-break:break-word;',
  pInQuote: 'font-size:15px;line-height:1.8;color:#475569;margin:0;word-break:break-word;',
  quote:
    'background:#f1f5f9;border-left:4px solid #94a3b8;border-radius:0 6px 6px 0;padding:14px 16px;margin:0 0 22px;',
  li: 'font-size:16px;line-height:1.85;color:#3f3f3f;letter-spacing:0.04em;margin:0 0 8px;word-break:break-word;',
  ul: 'padding-left:24px;margin:0 0 20px;',
  ol: 'padding-left:24px;margin:0 0 20px;',
  code: 'display:block;padding:16px;background:#0f172a;color:#e2e8f0;border-radius:8px;font-size:13.5px;line-height:1.75;overflow-x:auto;white-space:pre;margin:0 0 20px;font-family:Menlo,Consolas,monospace;',
  codespan:
    'padding:1px 5px;background:#f1f5f9;border-radius:4px;font-size:14px;color:#b91c1c;font-family:Menlo,Consolas,monospace;',
  hr: 'border:none;border-top:1px solid #e5e7eb;margin:34px 0;',
  img: 'display:block;max-width:100%;border-radius:8px;margin:24px auto 8px;',
  strong: 'font-weight:700;color:#111827;',
  em: 'font-style:italic;',
  ref: 'font-size:14px;line-height:1.8;color:#6b7280;word-break:break-all;',
  refTitle: 'font-size:16px;font-weight:700;color:#0f172a;margin:28px 0 8px;',
};

/** External links collected while rendering, emitted as a reference list at the end. */
const references = [];

function registerReference(title, href) {
  const existing = references.findIndex(r => r.href === href);
  if (existing >= 0) return existing + 1;
  references.push({ title, href });
  return references.length;
}

/** Read an image next to the article and inline it, so the paste carries the artwork. */
function inlineImage(href) {
  if (/^(https?:)?\/\//.test(href) || href.startsWith('data:')) return href;
  const abs = path.resolve(path.dirname(SRC), decodeURIComponent(href.split('#')[0]));
  if (!fs.existsSync(abs)) {
    console.warn(`  ! missing image, kept alt text instead: ${href}`);
    return '';
  }
  const mime =
    abs.endsWith('.jpg') || abs.endsWith('.jpeg') ? 'image/jpeg' : abs.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
}

marked.use({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const style = depth === 1 ? S.h1 : depth === 2 ? S.h2 : S.h3;
      return `<h${Math.min(depth, 3)} style="${style}">${text}</h${Math.min(depth, 3)}>\n`;
    },
    paragraph({ tokens }) {
      const text = this.parser.parseInline(tokens);
      const image = tokens.find(t => t.type === 'image');
      if (image && tokens.length === 1) {
        const src = inlineImage(image.href);
        if (!src) return `<p style="${S.p}">${image.text}</p>\n`;
        return `<img src="${src}" alt="${image.text || ''}" style="${S.img}" /><p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 22px;">${image.text || ''}</p>\n`;
      }
      return `<p style="${S.p}">${text}</p>\n`;
    },
    blockquote({ tokens }) {
      const body = this.parser.parse(tokens).replaceAll(`style="${S.p}"`, `style="${S.pInQuote}"`);
      return `<blockquote style="${S.quote}">${body}</blockquote>\n`;
    },
    list({ items, ordered, start }) {
      const body = items.map(item => this.listitem(item)).join('');
      const tag = ordered ? 'ol' : 'ul';
      const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
      return `<${tag}${startAttr} style="${ordered ? S.ol : S.ul}">${body}</${tag}>\n`;
    },
    listitem({ tokens, task, checked }) {
      const body = this.parser.parse(tokens, { top: false }).replaceAll(`style="${S.p}"`, `style="${S.li}"`);
      const box = task ? `<input type="checkbox" disabled${checked ? ' checked' : ''} /> ` : '';
      return `<li style="${S.li}">${box}${body.trimStart()}</li>\n`;
    },
    code({ text }) {
      return `<code style="${S.code}">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n`;
    },
    codespan({ text }) {
      return `<code style="${S.codespan}">${text}</code>`;
    },
    hr() {
      return `<hr style="${S.hr}" />\n`;
    },
    strong({ tokens }) {
      return `<strong style="${S.strong}">${this.parser.parseInline(tokens)}</strong>`;
    },
    em({ tokens }) {
      return `<em style="${S.em}">${this.parser.parseInline(tokens)}</em>`;
    },
    image({ href, text }) {
      const src = inlineImage(href);
      return src ? `<img src="${src}" alt="${text || ''}" style="${S.img}" />` : text || '';
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!/^https?:\/\//i.test(href)) return text;
      const n = registerReference(text.replace(/<[^>]+>/g, ''), href);
      const label = title ? `${text}（${title}）` : text;
      return `<span style="color:#1d4ed8;">${label}</span><sup style="color:#2563eb;font-size:12px;">[${n}]</sup>`;
    },
  },
});

function run() {
  if (!fs.existsSync(SRC)) {
    console.error(`✗ article not found: ${SRC}`);
    process.exit(1);
  }
  const markdown = fs.readFileSync(SRC, 'utf8');
  const body = marked.parse(markdown);

  const refs = references.length
    ? `<h3 style="${S.refTitle}">参考资料</h3><ol style="${S.ol}">` +
      references.map(r => `<li style="${S.li}">${r.title}：<span style="${S.ref}">${r.href}</span></li>`).join('') +
      '</ol>'
    : '';

  const html = `<!DOCTYPE html>
<html lang="zh-Hans">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WeChat draft — ${path.basename(SRC, '.md')}</title>
  </head>
  <body style="margin:0;padding:0;background:#fff;">
    <!-- 打开本文件 → 全选（⌘A）→ 复制（⌘C）→ 粘贴进公众号编辑器。
         样式已内联、图片已内嵌，无需再手动上传正文配图；封面图需单独上传。
         外链已按微信规则转为文末「参考资料」。 -->
    <section style="${S.p}max-width:677px;margin:0 auto;padding:24px 16px 40px;">
${body}
${refs}
    </section>
  </body>
</html>
`;

  fs.writeFileSync(OUT, html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`✓ ${path.relative(__dirname, OUT)}  (${kb} KB, ${references.length} reference(s), images inlined)`);
  console.log('  Open it in a browser, select all, copy, paste into the WeChat editor.');
}

run();

export const DOCUMENT_CSS = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.7;
      color: #1f2937;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.3;
      color: #111827;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.25em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em; }
    p { margin: 0.75em 0; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    strong, b { font-weight: 600; }
    em, i { font-style: italic; }
    ul, ol { padding-left: 2em; margin: 0.75em 0; }
    li { margin: 0.25em 0; }
    li > ul, li > ol { margin: 0.25em 0; }
    blockquote {
      border-left: 4px solid #d1d5db;
      margin: 1em 0;
      padding: 0.5em 1em;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 0 4px 4px 0;
    }
    blockquote p { margin: 0.25em 0; }
    pre {
      background: #f3f4f6;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.875em;
      line-height: 1.6;
      border: 1px solid #e5e7eb;
    }
    code {
      background: #f3f4f6;
      padding: 0.15em 0.4em;
      border-radius: 4px;
      font-size: 0.875em;
      font-family: "SF Mono", Monaco, Consolas, "Liberation Mono", monospace;
      border: 1px solid #e5e7eb;
    }
    pre code { background: none; padding: 0; border: none; font-size: inherit; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    tr:nth-child(even) { background: #f9fafb; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
    input[type="checkbox"] { margin-right: 0.5em; }
    dl { margin: 1em 0; }
    dt { font-weight: 600; margin-top: 0.5em; }
    dd { margin-left: 1.5em; margin-bottom: 0.25em; }
`;

export interface WrapHtmlOptions {
  title?: string;
  /** CSS appended after DOCUMENT_CSS inside the same <style> tag */
  extraCss?: string;
}

export function wrapHtmlDocument(body: string, options: WrapHtmlOptions = {}): Blob {
  const { title = 'Converted Document', extraCss = '' } = options;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${DOCUMENT_CSS}${extraCss}</style>
</head>
<body>
${body}
</body>
</html>`;
  return new Blob([html], { type: 'text/html' });
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(value: string): string {
  return escapeHtml(value);
}

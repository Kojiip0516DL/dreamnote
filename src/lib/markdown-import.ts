// Markdown → BlockNote blocks converter (lossy best-effort).
//
// BlockNote 0.19 doesn't ship a markdown importer, so we walk the markdown
// line-by-line and emit BlockNote blocks. Supported:
//   - ATX headings (# .. ######)
//   - Paragraphs
//   - Bullet/numbered list items
//   - Task list items (- [ ] / - [x])
//   - Blockquotes (>, >>)
//   - Fenced code blocks (``` and ~~~)
//   - Horizontal rule (---, ***)
//   - Inline: **bold**, *italic*, `code`, [text](url), ~~strike~~
// Unknown constructs fall through as paragraph text — the user can
// hand-edit them after import.
export type ImportedBlock = {
  type: string;
  props?: Record<string, any>;
  content: any[];
  children?: ImportedBlock[];
};

// Inline markdown parser. Returns text segments with .styles.
// Supports: **bold**, *italic*, ~~strike~~, `code`, [text](url).
function parseInline(line: string): any[] {
  const segments: any[] = [];
  let i = 0;
  let buf = "";
  // stack of open style states; bottom is empty styles
  const stack: Record<string, any>[] = [{}];
  const top = () => stack[stack.length - 1];

  const flush = () => {
    if (!buf) return;
    segments.push({ type: "text", text: buf, styles: { ...top() } });
    buf = "";
  };

  while (i < line.length) {
    // --- **bold** / __bold__ ---
    if (line.startsWith("**", i) || line.startsWith("__", i)) {
      flush();
      stack.push({ ...top(), bold: true });
      i += 2;
      continue;
    }
    // --- *italic* / _italic_ ---
    if (
      (line[i] === "*" && !line.startsWith("**", i)) ||
      (line[i] === "_" && !line.startsWith("__", i))
    ) {
      flush();
      stack.push({ ...top(), italic: true });
      i += 1;
      continue;
    }
    // --- ~~strike~~ ---
    if (line.startsWith("~~", i)) {
      flush();
      stack.push({ ...top(), strike: true });
      i += 2;
      continue;
    }
    // --- `code` ---
    if (line[i] === "`") {
      const end = line.indexOf("`", i + 1);
      if (end > i) {
        flush();
        segments.push({
          type: "text",
          text: line.slice(i + 1, end),
          styles: { ...top(), code: true },
        });
        i = end + 1;
        continue;
      }
    }
    // --- [text](url) ---
    if (line[i] === "[") {
      const labelEnd = line.indexOf("]", i + 1);
      const openParen = labelEnd > 0 ? line.indexOf("(", labelEnd + 1) : -1;
      if (labelEnd > 0 && openParen === labelEnd + 1) {
        const urlEnd = line.indexOf(")", openParen + 1);
        if (urlEnd > 0) {
          flush();
          segments.push({
            type: "text",
            text: line.slice(i + 1, labelEnd),
            styles: { ...top(), link: line.slice(openParen + 1, urlEnd) },
          });
          i = urlEnd + 1;
          continue;
        }
      }
    }
    // --- Close a marker if we're at its trailing edge ---
    if (stack.length > 1) {
      const last = stack[stack.length - 1];
      if (last.bold && (line.startsWith("**", i) || line.startsWith("__", i))) {
        flush();
        stack.pop();
        i += 2;
        continue;
      }
      if (last.italic && (line[i] === "*" || line[i] === "_") &&
          !line.startsWith("**", i) && !line.startsWith("__", i)) {
        flush();
        stack.pop();
        i += 1;
        continue;
      }
      if (last.strike && line.startsWith("~~", i)) {
        flush();
        stack.pop();
        i += 2;
        continue;
      }
    }
    buf += line[i];
    i++;
  }
  flush();
  return segments.filter((s) => s.text.length > 0);
}

export function markdownToBlocks(md: string): ImportedBlock[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: ImportedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { i++; continue; }

    // Fenced code block
    const fence = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const close = fence[1][0];
      let body = "";
      i++;
      while (i < lines.length && !lines[i].startsWith(close.repeat(3))) {
        body += lines[i] + "\n";
        i++;
      }
      if (i < lines.length) i++; // consume fence
      out.push({
        type: "codeBlock",
        props: { language: fence[2] || "plaintext" },
        content: [{ type: "text", text: body.replace(/\n$/, ""), styles: {} }],
      });
      continue;
    }

    // Horizontal rule
    if (/^(?:---|___|\*\*\*)$/.test(line.trim())) {
      out.push({ type: "divider", content: [] });
      i++; continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      out.push({
        type: "heading",
        props: { level: h[1].length },
        content: parseInline(h[2]),
      });
      i++; continue;
    }

    // Block quote (single >, multi-line)
    if (line.startsWith(">")) {
      let body = "";
      while (i < lines.length && lines[i].startsWith(">")) {
        body += lines[i].replace(/^>\s?/, "") + "\n";
        i++;
      }
      // recurse for nested markdown
      const inner = markdownToBlocks(body.trim());
      out.push({ type: "quote", content: [{ type: "text", text: body.trim(), styles: {} }] });
      continue;
    }

    // Task list / bullet
    const task = line.match(/^\s*-\s+\[( |x|X)\]\s+(.*)$/);
    if (task) {
      out.push({
        type: "checkListItem",
        props: { checked: task[1].toLowerCase() === "x" },
        content: parseInline(task[2]),
      });
      i++; continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      out.push({
        type: "bulletListItem",
        content: parseInline(bullet[1]),
        props: {},
      });
      i++; continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      out.push({
        type: "numberedListItem",
        content: parseInline(numbered[1]),
        props: {},
      });
      i++; continue;
    }

    // Default: paragraph (collapse consecutive lines into one until blank line)
    let para = line + "\n";
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>\s|-\s\[|\s*[-*+]\s|\s*\d+\.\s|```|~~~)/.test(lines[i])) {
      para += lines[i] + "\n";
      i++;
    }
    out.push({
      type: "paragraph",
      content: parseInline(para.replace(/\n$/, "")),
    });
  }
  return out;
}

// Promise-returning convenience wrapper for the editor (.then()).
export async function importMarkdownFile(file: File): Promise<ImportedBlock[]> {
  const text = await file.text();
  return markdownToBlocks(text);
}
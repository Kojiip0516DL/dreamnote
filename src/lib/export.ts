// Note export utilities. Three formats:
//   - Markdown (.md)           — round-trip safe into Obsidian, VS Code, Notability
//   - PDF (.pdf)               — printable, shareable, via jsPDF + html2canvas
//   - Backup JSON (.zip)       — bulk export every note + DB-blob metadata
//
// All exports are client-side. The user is the source of truth for their
// data; we never roundtrip through a server.
import { BlockNoteEditor } from "@blocknote/core";
import { blocksToMarkdown } from "@blocknote/core";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export type NoteExportRow = {
  id: string;
  title: string;
  content: string;     // JSON string of BlockNote blocks
  plaintext: string;
  pinned: boolean;
  isDaily: boolean;
  dailyFor: string | null;
  folderId: string | null;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
};

// ======================== Markdown ========================

function tryParse(json: string): any[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function safeFilename(title: string) {
  const s = (title || "Untitled").replace(/[\\/:*?"<>|]+/g, "_").trim();
  return s.length ? s : "Untitled";
}

export async function exportSingleAsMarkdown(note: NoteExportRow) {
  const blocks = tryParse(note.content);
  // @ts-ignore — third-party types for blocksToMarkdown vary across patches
  const md = await blocksToMarkdown(blocks as any);
  const header =
    `# ${note.title || "Untitled"}\n\n` +
    `*${new Date(note.createdAt).toLocaleString()} · ${note.wordCount} words*\n\n`;
  const blob = new Blob([header + (md || note.plaintext || "").trim() + "\n"], {
    type: "text/markdown;charset=utf-8",
  });
  saveAs(blob, `${safeFilename(note.title)}.md`);
}

// ======================== HTML ========================

export function exportSingleAsHtml(note: NoteExportRow) {
  const blocks = tryParse(note.content);
  const body = blocksToHtml(blocks);
  const doc =
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(note.title || "Untitled")}</title>` +
    `<meta name="generator" content="DreamNote">` +
    `<style>` +
    `body{font-family:Inter,system-ui,sans-serif;max-width:760px;margin:48px auto;color:#111;line-height:1.6;padding:0 24px}` +
    `h1{margin:0 0 4px}h1+div{color:#666;font-size:12px;margin-bottom:32px;border-bottom:1px solid #eee;padding-bottom:24px}` +
    `blockquote{border-left:3px solid #ccc;padding:.2em 1em;color:#555;font-style:italic;margin:.8em 0}` +
    `code{background:#f3f3f5;padding:1px 4px;border-radius:3px;font-size:.9em}` +
    `pre{background:#0f0f12;color:#e7e7ea;padding:16px;border-radius:8px;font-family:JetBrains Mono,monospace;font-size:13px;white-space:pre-wrap;overflow-x:auto}` +
    `hr{border:none;border-top:1px solid #ddd;margin:1.5em 0}` +
    `</style></head><body>` +
    `<h1>${escapeHtml(note.title || "Untitled")}</h1>` +
    `<div>${new Date(note.createdAt).toLocaleString()} · ${note.wordCount} words</div>` +
    body +
    `</body></html>`;
  const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
  saveAs(blob, `${safeFilename(note.title)}.html`);
}

// ======================== PDF ========================

// Render the live BlockNote DOM straight to PDF. Works for headings, lists,
// tables, code, images. Long notes auto-paginate by A4 page height.
export async function exportSingleAsPdf(note: NoteExportRow) {
  // Build an offscreen container with the BlockNote HTML. Easiest path:
  // re-parse via DOMParser so we get the same DOM shape BlockNote would
  // produce. We don't need full fidelity — paragraphs/headings/lists render
  // fine, complex blocks are best-effort.
  const blocks = tryParse(note.content);
  const html = blocksToHtml(blocks);

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div style="font-family:Inter,system-ui,sans-serif;padding:48px;width:794px;color:#111;background:#fff">
      <h1 style="font-size:28px;margin:0 0 8px">${escapeHtml(note.title || "Untitled")}</h1>
      <div style="color:#666;font-size:12px;margin-bottom:24px">
        ${new Date(note.createdAt).toLocaleString()} · ${note.wordCount} words
      </div>
      <div>${html}</div>
    </div>`;
  wrap.style.position = "fixed";
  wrap.style.left = "-9999px";
  wrap.style.top = "0";
  document.body.appendChild(wrap);

  const canvas = await html2canvas(wrap.firstElementChild as HTMLElement, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  document.body.removeChild(wrap);

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgRatio = canvas.height / canvas.width;
  const imgW = pageW;
  const imgH = imgW * imgRatio;

  if (imgH <= pageH) {
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgW, imgH);
  } else {
    // Slice the canvas into A4-sized pages
    const pageCanvas = document.createElement("canvas");
    const ctx = pageCanvas.getContext("2d")!;
    pageCanvas.width = canvas.width;
    const sliceH = canvas.width * (pageH / pageW);
    let y = 0;
    let pageIndex = 0;
    while (y < canvas.height) {
      const h = Math.min(sliceH, canvas.height - y);
      pageCanvas.height = h;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      const pageImg = pageCanvas.toDataURL("image/png");
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(pageImg, "PNG", 0, 0, pageW, pageW * (h / canvas.width));
      y += h;
      pageIndex++;
    }
  }
  pdf.save(`${safeFilename(note.title)}.pdf`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

// Minimal BlockNote-to-HTML renderer for the PDF path. Only handles the
// most common block types — extended blocks fall through to plain text.
function blocksToHtml(blocks: any[]): string {
  let out = "";
  for (const b of blocks ?? []) {
    const inline = (spans: any[] = []) =>
      spans.map((s) => {
        let t = escapeHtml(s.text ?? "");
        if (s.bold)   t = `<b>${t}</b>`;
        if (s.italic) t = `<i>${t}</i>`;
        if (s.code)   t = `<code style="background:#f3f3f5;padding:1px 4px;border-radius:3px">${t}</code>`;
        if (s.underline) t = `<u>${t}</u>`;
        if (s.strike) t = `<s>${t}</s>`;
        if (s.link)   t = `<a href="${escapeHtml(s.link)}">${t}</a>`;
        return t;
      }).join("");

    const props = b.props ?? {};
    switch (b.type) {
      case "heading": {
        const lvl = props.level ?? 2;
        out += `<h${lvl} style="font-weight:600;margin:1em 0 .4em;font-size:${24 - (lvl - 1) * 2}px">${inline(b.content)}</h${lvl}>`;
        break;
      }
      case "paragraph":
        out += `<p style="margin:.4em 0;line-height:1.6">${inline(b.content) || "<br>"}</p>`;
        break;
      case "bulletListItem":
        out += `<div style="display:flex;gap:8px;margin:.2em 0"><span>•</span><span>${inline(b.content)}</span></div>`;
        break;
      case "numberedListItem":
        out += `<div style="display:flex;gap:8px;margin:.2em 0"><span>${b.props?.index ?? ""}.</span><span>${inline(b.content)}</span></div>`;
        break;
      case "checkListItem":
        out += `<div style="display:flex;gap:8px;margin:.2em 0"><span>${props.checked ? "☑" : "☐"}</span><span>${inline(b.content)}</span></div>`;
        break;
      case "quote":
        out += `<blockquote style="border-left:3px solid #ccc;margin:.8em 0;padding:.2em 1em;color:#555;font-style:italic">${inline(b.content)}</blockquote>`;
        break;
      case "codeBlock":
        out += `<pre style="background:#0f0f12;color:#e7e7ea;padding:16px;border-radius:8px;font-family:JetBrains Mono,monospace;font-size:13px;white-space:pre-wrap">${escapeHtml((b.content ?? []).map((c: any) => c.text).join(""))}</pre>`;
        break;
      case "divider":
        out += `<hr style="border:none;border-top:1px solid #ddd;margin:1.5em 0"/>`;
        break;
      default:
        out += `<div style="margin:.4em 0">${inline(b.content)}</div>`;
    }
  }
  return out;
}

// ======================== Backup ZIP ========================

export async function exportAllAsZip(notes: NoteExportRow[]) {
  const zip = new JSZip();
  const meta: any[] = [];
  for (const n of notes) {
    const fname = `${safeFilename(n.title)}_${n.id.slice(0, 6)}.md`;
    const blocks = tryParse(n.content);
    // @ts-ignore
    const md = await blocksToMarkdown(blocks as any);
    const body =
      `# ${n.title || "Untitled"}\n\n` +
      `> Created ${new Date(n.createdAt).toISOString()}\n` +
      `> Updated ${new Date(n.updatedAt).toISOString()}\n` +
      `> Words: ${n.wordCount}${n.isDaily ? "\n> Daily note" : ""}\n\n` +
      (md || n.plaintext || "").trim() +
      "\n";
    zip.file(fname, body);
    meta.push({
      id: n.id, title: n.title, folderId: n.folderId, pinned: n.pinned,
      isDaily: n.isDaily, dailyFor: n.dailyFor,
      createdAt: n.createdAt, updatedAt: n.updatedAt, wordCount: n.wordCount,
    });
  }
  zip.file(
    "dreamnote-export.json",
    JSON.stringify({ exportedAt: new Date().toISOString(), count: notes.length, notes: meta }, null, 2),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `dreamnote-export-${new Date().toISOString().slice(0, 10)}.zip`);
}

// ======================== Raw JSON (for re-import) ========================

export function exportSingleAsJson(note: NoteExportRow) {
  const blob = new Blob([note.content], { type: "application/json" });
  saveAs(blob, `${safeFilename(note.title)}.blocknote.json`);
}
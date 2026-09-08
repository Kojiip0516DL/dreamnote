"use client";
import { useCreateBlockNote, useEditorContentOrSelectionChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Pin, PinOff, Download, PenLine } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  exportSingleAsMarkdown,
  exportSingleAsPdf,
  exportSingleAsHtml,
  exportSingleAsJson,
  type NoteExportRow,
} from "@/lib/export";
import { markdownToBlocks } from "@/lib/markdown-import";

type Note = {
  id: string; title: string; content: string; folderId: string | null;
  pinned: boolean; trashed: boolean; isDaily: boolean; dailyFor: string | null;
};

export default function Editor({ note, onChanged }: { note: Note; onChanged: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(note.title);
  const [exportOpen, setExportOpen] = useState(false);
  const [penMode, setPenMode] = useState(false);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => setTitle(note.title), [note.id, note.title]);

  const initial = useMemo(() => {
    try { return note.content?.trim() ? JSON.parse(note.content) : undefined; }
    catch { return undefined; }
  }, [note.id]);

  const editor = useCreateBlockNote({ initialContent: initial });

  useEditorContentOrSelectionChange(() => {
    try {
      const document = (editor as any).document;
      const json = JSON.stringify(document);
      const plaintext = document
        .flatMap((b: any) => (b.content ?? []).map((c: any) => c.text ?? ""))
        .join(" ");
      const wordCount = plaintext.split(/\s+/).filter(Boolean).length;
      debounceSave(note.id, { content: json, plaintext, wordCount });
      onChanged();
    } catch {}
  }, editor as any);

  // Import a .md file's worth of blocks — appends to the current document.
  async function importMd(file: File) {
    if (!file.name.toLowerCase().endsWith(".md") && file.type !== "text/markdown") {
      alert("Please choose a .md file.");
      return;
    }
    const blocks = markdownToBlocks(await file.text()) as any[];
    try {
      const last = (editor as any).document?.slice(-1)[0]?.id;
      if (last) (editor as any).insertBlocks(blocks, last, "after");
      else (editor as any).insertBlocks(blocks, (editor as any).document[0]?.id);
    } catch {
      // editor not ready yet — set initial content via re-create
      const merged = [...((editor as any).document ?? []), ...blocks];
      (editor as any)._tiptapEditor?.commands?.setContent({ type: "doc", content: merged });
    }
  }

  // Replace whole note content with a .md file's blocks.
  async function replaceWithMarkdown(file: File) {
    if (!file.name.toLowerCase().endsWith(".md")) return;
    if (!confirm("Replace this note's content with the .md file?\n\nThis cannot be undone.")) return;
    const blocks = markdownToBlocks(await file.text()) as any[];
    const ids = ((editor as any).document ?? []).map((b: any) => b.id);
    try {
      (editor as any).replaceBlocks(ids, blocks);
    } catch {
      (editor as any)._tiptapEditor?.commands?.setContent({ type: "doc", content: blocks });
    }
  }

  function pickFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,text/markdown";
    input.multiple = false;
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) importMd(f);
    };
    input.click();
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (title !== note.title) debounceSave(note.id, { title });
      onChanged();
    }, 400);
    return () => clearTimeout(t);
  }, [title]);

  // Pen-mode listener — fires whenever the user toggles Normal / Pen only
  // in the PenToolbar in the sidebar footer. Sets state so the editor can
  // render the banner and attach the touch blocker.
  useEffect(() => {
    const stored = localStorage.getItem("dreamnote:editor:mode") as "normal" | "pen" | null;
    if (stored) setPenMode(stored === "pen");
    const onMode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setPenMode(detail === "pen");
    };
    window.addEventListener("dreamnote:editor-mode", onMode);
    return () => window.removeEventListener("dreamnote:editor-mode", onMode);
  }, []);

  // Touch blocker — when pen-only, intercept pointerdown/touch events from
  // the editor wrapper that have pointerType === "touch" and cancel them.
  // Must be non-passive so we can call preventDefault. We only attach while
  // penMode is true so there's zero overhead in normal mode.
  useEffect(() => {
    const el = editorWrapRef.current;
    if (!el || !penMode) return;
    const isFinger = (e: PointerEvent) =>
      e.pointerType === "touch" || (e.pointerType === "pen" && e.pressure === 0 && (e.width ?? 0) > 10);
    const block = (e: Event) => {
      // PointerEvent with pointerType touch — cancel
      const pe = e as PointerEvent;
      if (pe.pointerType !== undefined && isFinger(pe)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Fallback for older touch events
      if ((e as TouchEvent).touches !== undefined) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener("pointerdown", block as any, { capture: true });
    el.addEventListener("touchstart",  block as any, { capture: true, passive: false });
    el.addEventListener("touchmove",   block as any, { capture: true, passive: false });
    return () => {
      el.removeEventListener("pointerdown", block as any, { capture: true } as any);
      el.removeEventListener("touchstart",  block as any, { capture: true } as any);
      el.removeEventListener("touchmove",   block as any, { capture: true } as any);
    };
  }, [penMode]);

  async function setFlag(partial: Partial<Note>) {
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    qc.invalidateQueries({ queryKey: ["notes"] });
  }

  // Build a snapshot of the current note in the shape export.ts expects.
  // Pulls the freshest content from the live editor, falling back to the
  // server-saved JSON. Title/title uses the local state — server hasn't
  // been pinged yet because of the 400ms title debounce.
  function snapshot(): NoteExportRow {
    let content = note.content;
    try {
      content = JSON.stringify((editor as any).document);
    } catch {}
    const plaintext = ((editor as any).document ?? [])
      .flatMap((b: any) => (b.content ?? []).map((c: any) => c.text ?? ""))
      .join(" ");
    return {
      id: note.id,
      title,
      content,
      plaintext,
      folderId: note.folderId,
      pinned: note.pinned,
      isDaily: note.isDaily,
      dailyFor: note.dailyFor,
      wordCount: plaintext.split(/\s+/).filter(Boolean).length,
      createdAt: (note as any).createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (!editor) return <div className="grid place-items-center h-full text-dl-mute">Loading editor…</div>;

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      <header className="border-b border-dl-line px-6 py-3 flex items-center gap-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Untitled"
          className="flex-1 bg-transparent outline-none text-2xl font-semibold tracking-tight"
        />
        <button
          title={note.pinned ? "Unpin" : "Pin"}
          onClick={() => setFlag({ pinned: !note.pinned } as any)}
          className="p-2 rounded hover:bg-dl-line"
        >
          {note.pinned ? <Pin className="w-4 h-4 text-dl-accent" /> : <PinOff className="w-4 h-4" />}
        </button>

        {/* Export menu — Markdown / PDF / raw blocknote JSON */}
        <div className="relative">
          <button
            title="Export"
            onClick={() => setExportOpen(o => !o)}
            className="p-2 rounded hover:bg-dl-line flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs text-dl-mute hidden sm:inline">Export</span>
          </button>
          {exportOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setExportOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-56 z-20 rounded-xl border border-dl-line bg-dl-panel shadow-xl overflow-hidden">
                <button
                  onClick={async () => { setExportOpen(false); await exportSingleAsMarkdown(snapshot()); }}
                  className="w-full text-left px-3 py-2 hover:bg-dl-line text-sm flex items-center gap-2"
                >
                  <span>📝</span>
                  <div>
                    <div className="font-medium">Markdown</div>
                    <div className="text-[11px] text-dl-mute">.md · for Obsidian / Notability / VS Code</div>
                  </div>
                </button>
                <button
                  onClick={async () => { setExportOpen(false); await exportSingleAsPdf(snapshot()); }}
                  className="w-full text-left px-3 py-2 hover:bg-dl-line text-sm flex items-center gap-2"
                >
                  <span>📄</span>
                  <div>
                    <div className="font-medium">PDF</div>
                    <div className="text-[11px] text-dl-mute">.pdf · printable, shareable</div>
                  </div>
                </button>
                <button
                  onClick={() => { setExportOpen(false); exportSingleAsHtml(snapshot()); }}
                  className="w-full text-left px-3 py-2 hover:bg-dl-line text-sm flex items-center gap-2"
                >
                  <span>🌐</span>
                  <div>
                    <div className="font-medium">HTML</div>
                    <div className="text-[11px] text-dl-mute">.html · standalone webpage</div>
                  </div>
                </button>
                <button
                  onClick={() => { setExportOpen(false); exportSingleAsJson(snapshot()); }}
                  className="w-full text-left px-3 py-2 hover:bg-dl-line text-sm flex items-center gap-2 border-t border-dl-line"
                >
                  <span>⚙️</span>
                  <div>
                    <div className="font-medium">BlockNote JSON</div>
                    <div className="text-[11px] text-dl-mute">.json · full fidelity, re-importable</div>
                  </div>
                </button>
                <div className="border-t border-dl-line" />
                <button
                  onClick={() => { setExportOpen(false); pickFile(); }}
                  className="w-full text-left px-3 py-2 hover:bg-dl-line text-sm flex items-center gap-2"
                >
                  <span>📥</span>
                  <div>
                    <div className="font-medium">Import .md → append</div>
                    <div className="text-[11px] text-dl-mute">drag a .md here, or pick a file</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        <button
          title="Move to trash"
          onClick={() => setFlag({ trashed: true, trashedAt: new Date().toISOString() } as any)}
          className="p-2 rounded hover:bg-dl-line text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </header>
      <div className="flex-1 overflow-auto px-8 py-6 max-w-3xl mx-auto w-full relative">
        {penMode && (
          <div className="sticky top-0 z-10 mb-4 flex items-center gap-2 rounded-lg border border-dl-accent2/30 bg-dl-accent2/10 text-dl-accent2 px-3 py-2 text-sm">
            <PenLine className="w-4 h-4" />
            <span>
              <b>Pen mode</b> — finger touches are blocked. Use your stylus or keyboard.
            </span>
            <button
              onClick={() => {
                localStorage.setItem("dreamnote:editor:mode", "normal");
                window.dispatchEvent(new CustomEvent("dreamnote:editor-mode", { detail: "normal" }));
              }}
              className="ml-auto text-xs underline hover:no-underline"
            >
              switch off
            </button>
          </div>
        )}
        <div ref={editorWrapRef}>
          <BlockNoteView editor={editor} theme="dark" />
        </div>
      </div>
    </main>
  );
}

// ===== Debounced saver (per-note) =====
const timers = new Map<string, any>();
const lastBody = new Map<string, string>();
function debounceSave(id: string, partial: Record<string, unknown>) {
  clearTimeout(timers.get(id));
  const body = JSON.stringify({ id, ...partial });
  if (lastBody.get(id) === body) return;
  lastBody.set(id, body);
  timers.set(id, setTimeout(async () => {
    await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
  }, 600));
}
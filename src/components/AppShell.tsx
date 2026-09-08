"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";

type Note = {
  id: string;
  title: string;
  content: string;        // JSON string
  plaintext: string;
  folderId: string | null;
  pinned: boolean;
  trashed: boolean;
  isDaily: boolean;
  dailyFor: string | null; // ISO
  wordCount: number;
  updatedAt: string;
};

type Folder = { id: string; name: string; parentId: string | null; order: number; icon?: string | null };

export default function AppShell({ user }: { user: { name?: string | null; image?: string | null; inDreamLand: boolean; discordId: string } }) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const notesQ  = useQuery<Note[]>({ queryKey: ["notes"], queryFn: () => fetch("/api/notes").then(r => r.json()) });
  const foldersQ = useQuery<Folder[]>({ queryKey: ["folders"], queryFn: () => fetch("/api/folders").then(r => r.json()) });

  // Auto-create today's daily note once on first load if missing
  useEffect(() => {
    if (!notesQ.data) return;
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const exists = notesQ.data.some(n => n.isDaily && n.dailyFor === today.toISOString());
    if (!exists) {
      fetch("/api/notes/daily", { method: "POST" }).then(() => qc.invalidateQueries({ queryKey: ["notes"] }));
    }
  }, [notesQ.data, qc]);

  const filtered = useMemo(() => {
    const list = notesQ.data ?? [];
    const s = search.trim().toLowerCase();
    const out = list.filter(n => {
      if (n.trashed && !s.includes("trash")) return false;
      if (!s) return true;
      return n.title.toLowerCase().includes(s) || n.plaintext.toLowerCase().includes(s);
    });
    // pinned first, then by updatedAt
    return out.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [notesQ.data, search]);

  const active = useMemo(() => filtered.find(n => n.id === activeId) ?? filtered[0] ?? null, [filtered, activeId]);
  useEffect(() => { if (!activeId && filtered[0]) setActiveId(filtered[0].id); }, [filtered, activeId]);

  const createNote = useMutation({
    mutationFn: () => fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: (n: Note) => { qc.invalidateQueries({ queryKey: ["notes"] }); setActiveId(n.id); },
  });
  const createFolder = useMutation({
    mutationFn: (name: string) => fetch("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  });

  return (
    <div className="grid grid-cols-[300px_1fr] h-screen">
      <Sidebar
        user={user}
        notes={filtered}
        folders={foldersQ.data ?? []}
        activeId={active?.id ?? null}
        onSelect={setActiveId}
        search={search}
        onSearch={setSearch}
        onNewNote={() => createNote.mutate()}
        onNewFolder={(name) => createFolder.mutate(name || "New folder")}
      />
      {active ? (
        <Editor key={active.id} note={active} onChanged={() => qc.invalidateQueries({ queryKey: ["notes"] })} />
      ) : (
        <div className="grid place-items-center text-dl-mute">
          {notesQ.isLoading ? "Loading…" : "No notes yet — hit ⌘N to create one."}
        </div>
      )}
    </div>
  );
}
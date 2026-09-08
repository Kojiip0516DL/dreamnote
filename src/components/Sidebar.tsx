"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { NotebookPen, FolderPlus, Pin, Search, LogOut, Hash, CalendarDays, Download } from "lucide-react";
import { exportAllAsZip, type NoteExportRow } from "@/lib/export";
import PenToolbar from "@/components/PenToolbar";

type Note = {
  id: string; title: string; plaintext: string; pinned: boolean; trashed: boolean; isDaily: boolean; dailyFor: string | null;
  wordCount: number; updatedAt: string; folderId: string | null;
};
type Folder = { id: string; name: string; parentId: string | null; order: number; icon?: string | null };

export default function Sidebar({
  user, notes, folders, activeId, onSelect, search, onSearch, onNewNote, onNewFolder,
}: {
  user: { name?: string | null; image?: string | null; inDreamLand: boolean; discordId: string };
  notes: Note[]; folders: Folder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  search: string; onSearch: (s: string) => void;
  onNewNote: () => void;
  onNewFolder: (name: string) => void;
}) {
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const daily = notes.find(n => n.isDaily && new Date(n.dailyFor ?? "").toDateString() === new Date().toDateString());

  return (
    <aside className="bg-dl-panel border-r border-dl-line flex flex-col">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-dl-line">
        <NotebookPen className="w-5 h-5 text-dl-accent" />
        <span className="font-semibold tracking-tight">DreamNote</span>
        <div className="ml-auto flex items-center gap-2">
          <button title="New note" onClick={onNewNote} className="p-1.5 rounded hover:bg-dl-line"><NotebookPen className="w-4 h-4" /></button>
          <button title="New folder" onClick={() => setNewFolderMode(s => !s)} className="p-1.5 rounded hover:bg-dl-line"><FolderPlus className="w-4 h-4" /></button>
        </div>
      </div>

      {newFolderMode && (
        <div className="px-3 py-2 border-b border-dl-line">
          <input
            autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name" onKeyDown={e => { if (e.key === "Enter") { onNewFolder(newFolderName); setNewFolderName(""); setNewFolderMode(false); } }}
            className="w-full bg-dl-bg border border-dl-line rounded px-2 py-1 text-sm"
          />
        </div>
      )}

      <div className="px-3 py-2 border-b border-dl-line">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-dl-mute" />
          <input
            value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Search notes…" className="w-full bg-dl-bg border border-dl-line rounded pl-7 pr-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {folders.length > 0 && (
        <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-dl-mute">Folders</div>
      )}
      <div className="px-2">
        {folders.map(f => (
          <div key={f.id} className="px-2 py-1 rounded hover:bg-dl-line/40 text-sm text-dl-mute flex items-center gap-2">
            <span>{f.icon ?? "📁"}</span><span>{f.name}</span>
          </div>
        ))}
      </div>

      {daily && (
        <button onClick={() => onSelect(daily.id)} className={`mx-2 mt-3 flex items-center gap-2 text-sm px-2 py-1.5 rounded ${activeId === daily.id ? "bg-dl-line" : "hover:bg-dl-line/40"}`}>
          <CalendarDays className="w-4 h-4 text-dl-accent2" /> Today
        </button>
      )}

      <div className="px-3 pt-4 pb-1 text-[11px] uppercase tracking-wider text-dl-mute flex items-center justify-between">
        <span>All notes</span><span className="text-dl-mute/60">{notes.length}</span>
      </div>
      <nav className="flex-1 overflow-auto px-2 pb-2">
        {notes.map(n => (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={`w-full text-left px-2 py-2 rounded text-sm flex items-start gap-2 ${activeId === n.id ? "bg-dl-line" : "hover:bg-dl-line/40"}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                {n.pinned && <Pin className="w-3 h-3 text-dl-accent" />}
                {n.isDaily && <Hash className="w-3 h-3 text-dl-accent2" />}
                <span className="truncate font-medium">{n.title || "Untitled"}</span>
              </div>
              <div className="text-[11px] text-dl-mute truncate">{n.plaintext || "—"}</div>
              <div className="text-[10px] text-dl-mute/70 mt-0.5">{new Date(n.updatedAt).toLocaleString()} · {n.wordCount}w</div>
            </div>
          </button>
        ))}
      </nav>

      <div className="border-t border-dl-line p-3 flex items-center gap-2 text-sm">
        <PenToolbar />
        <button
          title="Export all notes (.zip)"
          onClick={() => exportAllAsZip(notes as unknown as NoteExportRow[])}
          className="p-1.5 rounded hover:bg-dl-line"
        >
          <Download className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-dl-line grid place-items-center overflow-hidden">
          {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : "👤"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium">{user.name ?? "Discord user"}</div>
          <div className="text-[11px] text-dl-mute">{user.inDreamLand ? "✓ DreamLand member" : "Pending join"}</div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/" })} title="Sign out" className="p-1.5 rounded hover:bg-dl-line">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
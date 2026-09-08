"use client";

// Pen / Finger mode toggle.
//
// Two states, persisted to localStorage:
//   "normal" — keyboard + mouse + finger can all type into the editor.
//   "pen"    — keyboard + mouse can type. Touch/finger events are
//              intercepted at the editor wrapper and cancelled, so users
//              with a stylus + resting palm (or kids poking the screen)
//              don't insert garbage characters.
//
// The actual input kind (Apple Pencil / Xiaomi Pen / generic stylus) is
// detected from PointerEvents and shown as a badge, but doesn't gate
// input — only the mode toggle does that. This matches GoodNotes /
// Notability / Apple Notes behavior.
import { useEffect, useState } from "react";
import { Apple, Smartphone, MousePointer2, PenLine, Hand } from "lucide-react";
import {
  classifyEvent,
  type PointerKind,
} from "@/lib/pointer";

const PREF_KEY = "dreamnote:pointer:preferred";
const MODE_KEY = "dreamnote:editor:mode";

export type EditorMode = "normal" | "pen";

const ALL: { kind: PointerKind; label: string; icon: any; color: string }[] = [
  { kind: "apple-pen",   label: "Apple Pencil", icon: Apple,         color: "text-pink-300" },
  { kind: "xiaomi-pen",  label: "Xiaomi Pen",   icon: PenLine,       color: "text-orange-300" },
  { kind: "generic-pen", label: "Generic Pen",  icon: PenLine,       color: "text-dl-accent2" },
  { kind: "finger",      label: "Finger / Touch", icon: Smartphone,  color: "text-amber-300" },
  { kind: "mouse",       label: "Mouse",        icon: MousePointer2, color: "text-dl-mute" },
];

function dispatchMode(mode: EditorMode) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<EditorMode>("dreamnote:editor-mode", { detail: mode }));
}

export default function PenToolbar() {
  const [detected, setDetected] = useState<PointerKind>("unknown");
  const [preferred, setPreferred] = useState<PointerKind | null>(null);
  const [mode, setMode] = useState<EditorMode>("normal");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const storedPref = localStorage.getItem(PREF_KEY);
    if (storedPref && ALL.find((p) => p.kind === storedPref)) {
      setPreferred(storedPref as PointerKind);
    }
    const storedMode = (localStorage.getItem(MODE_KEY) as EditorMode | null) ?? "normal";
    setMode(storedMode);
    dispatchMode(storedMode);

    const onPointer = (e: PointerEvent) => setDetected(classifyEvent(e));
    window.addEventListener("pointerdown", onPointer, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  function setModeAndPersist(m: EditorMode) {
    setMode(m);
    localStorage.setItem(MODE_KEY, m);
    dispatchMode(m);
  }

  function pick(kind: PointerKind) {
    setPreferred(kind);
    localStorage.setItem(PREF_KEY, kind);
    setOpen(false);
  }

  const active = preferred ?? detected;
  const activeMeta = ALL.find((p) => p.kind === active) ?? ALL[3];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={`Active input: ${activeMeta.label} · mode: ${mode}`}
        className={`px-2 h-7 rounded-md border transition flex items-center gap-1.5 text-xs ${
          mode === "pen"
            ? "border-dl-accent2/40 bg-dl-accent2/10 text-dl-accent2"
            : "border-dl-line bg-dl-bg hover:bg-dl-line/40"
        }`}
      >
        <activeMeta.icon className={`w-3.5 h-3.5 ${activeMeta.color}`} />
        <span className="hidden sm:inline">{mode === "pen" ? "Pen mode" : activeMeta.label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-60 z-20 rounded-xl border border-dl-line bg-dl-panel shadow-xl overflow-hidden">
            {/* Mode toggle — main feature */}
            <div className="px-3 pt-3 pb-2">
              <div className="text-[10px] uppercase tracking-wider text-dl-mute mb-1.5">Input mode</div>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-dl-bg border border-dl-line">
                <button
                  onClick={() => { setModeAndPersist("normal"); setOpen(false); }}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition ${
                    mode === "normal" ? "bg-dl-line text-dl-ink" : "text-dl-mute hover:text-dl-ink"
                  }`}
                >
                  <Hand className="w-3.5 h-3.5 inline mr-1" />
                  Normal
                </button>
                <button
                  onClick={() => { setModeAndPersist("pen"); setOpen(false); }}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition ${
                    mode === "pen" ? "bg-dl-accent2/20 text-dl-accent2" : "text-dl-mute hover:text-dl-accent2"
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5 inline mr-1" />
                  Pen only
                </button>
              </div>
              <div className="text-[10px] text-dl-mute mt-1.5 leading-tight">
                {mode === "pen"
                  ? "Finger touches are ignored. Use your stylus or keyboard."
                  : "All input devices work. Touch won't trigger if you rest a palm."}
              </div>
            </div>

            <div className="border-t border-dl-line" />
            <div className="px-3 pt-2 text-[10px] uppercase tracking-wider text-dl-mute">
              Preferred input
            </div>
            {ALL.map((p) => (
              <button
                key={p.kind}
                onClick={() => pick(p.kind)}
                className={`w-full text-left px-3 py-1.5 hover:bg-dl-line text-sm flex items-center gap-2 ${
                  preferred === p.kind ? "bg-dl-line/40" : ""
                }`}
              >
                <p.icon className={`w-4 h-4 ${p.color}`} />
                <span className="flex-1">{p.label}</span>
                {detected === p.kind && (
                  <span className="text-[10px] text-dl-accent2">detected</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
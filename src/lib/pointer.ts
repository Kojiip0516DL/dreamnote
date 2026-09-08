// Pointer input classification.
//
// Maps a PointerEvent (or just the UA + capabilities) to one of:
//   "apple-pen"      — Apple Pencil (gen-1/gen-2) on iPad, via Safari/webkit
//   "xiaomi-pen"     — Xiaomi Smart Pen on Xiaomi tablets, via MIUI browser
//                      or any browser reporting xiaomi vendor + pen pointer
//   "generic-pen"    — any PointerType=pen from a vendor we don't recognise
//   "finger"         — touch input
//   "mouse"          — mouse / trackpad
//   "unknown"        — fallback when no event metadata is present
//
// Detection strategy:
//   1) Hardware fingerprint first. We trust PointerEvent.pointerType
//      ("pen" / "touch") above all else — browsers tell us directly.
//   2) For "pen" type, sniff UA / vendor for Apple vs Xiaomi branding.
//      Apple's WebKit is the only major UA that ships with iPad-side
//      pointer events, and Apple Pencil always reports pressure / tilt
//      (a finger never does). Xiaomi pens on the Mi Pad / Redmi Pad
//      ship with Chrome-based MIUI browsers — their navigator.vendor
//      and user-agent data hints surface distinctly.
//   3) Pressure sample: Apple Pencil ≥ 0.001, Xiaomi pen usually 0;
//      finger pressure is exactly 0 (no pressure axis).
export type PointerKind =
  | "apple-pen"
  | "xiaomi-pen"
  | "generic-pen"
  | "finger"
  | "mouse"
  | "unknown";

const XIAOMI_UA = /(miui|xiaomi|redmi|poco|hmnote|hmpac|haydn|nabu|enuma|inona|lisa|elish|dagu|zeus|ares)/i;

export interface PointerSample {
  pointerType?: string;       // from PointerEvent.pointerType
  pressure?: number;
  vendor?: string;            // navigator.vendor
  userAgent?: string;         // navigator.userAgent
  maxTouchPoints?: number;    // navigator.maxTouchPoints
  hasTilt?: boolean;          // event.tiltX/tiltY supported (Apple Pencil yes)
  platform?: string;          // navigator.platform
}

/** Pure classifier — testable in isolation. */
export function classifyPointer(s: PointerSample): PointerKind {
  const type = (s.pointerType ?? "").toLowerCase();

  // 1) Mouse
  if (type === "mouse") return "mouse";

  // 2) Touch → finger (touch can be reported by stylii, but stylii surface
  // pointerType="pen" not "touch", so this branch is finger-or-no-data).
  if (type === "touch") return "finger";

  // 3) Pen → sniff vendor / UA
  if (type === "pen") {
    const ua = (s.userAgent ?? "").toLowerCase();
    const vendor = (s.vendor ?? "").toLowerCase();
    const platform = (s.platform ?? "").toLowerCase();

    // Apple: WebKit on iPad/iPhone only, plus Pencil tilt support.
    const isApple =
      vendor.includes("apple computer") ||
      platform === "iphone" || platform === "ipad" || platform === "ipod" ||
      // iPadOS 13+ spoofs as Mac but keeps touch
      (ua.includes("mac") && (s.maxTouchPoints ?? 0) > 0);
    if (isApple && s.hasTilt) return "apple-pen";

    // Xiaomi: regex on UA + a vendor hint. The Smart Pen is a Pen only on
    // recent MIUI/HyperOS builds.
    if (XIAOMI_UA.test(ua) || XIAOMI_UA.test(vendor)) return "xiaomi-pen";

    return "generic-pen";
  }

  // 4) Empty pointerType → heuristic. Some old browsers / Tauri send nothing.
  if (!type) {
    if ((s.maxTouchPoints ?? 0) > 0) return "finger";
    return "unknown";
  }
  return "unknown";
}

/** Convenience for use in event handlers. */
export function classifyEvent(e: PointerEvent): PointerKind {
  return classifyPointer({
    pointerType: e.pointerType,
    pressure: e.pressure,
    hasTilt: typeof e.tiltX === "number" && typeof e.tiltY === "number",
  });
}

/** Sample current browser — useful for the toolbar default. */
export function sampleBrowser(): PointerSample {
  if (typeof navigator === "undefined") return { pointerType: "unknown" };
  return {
    pointerType: "unknown",
    vendor: navigator.vendor,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    hasTilt: typeof window !== "undefined" && "PointerEvent" in window,
  };
}

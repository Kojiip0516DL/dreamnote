"use client";

// DreamLand membership gate.
// Shown when session.user.inDreamLand === false. Two paths:
//   1) "I just signed up — auto-add me"  → triggers a fresh sign-in (the
//      events.signIn hook handles force-join). Sign out + sign in.
//   2) "I am a member"                    → POST /api/join-dreamland to re-
//      verify against Discord (for users already in guild, e.g. owner).
// No skip button — DreamNote requires DreamLand membership.
import { signIn, useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, LogIn } from "lucide-react";

export default function JoinDreamLandGate() {
  const { update } = useSession();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const verify = useMutation({
    mutationFn: () => fetch("/api/join-dreamland", { method: "POST" }).then(r => r.json()),
    onSuccess: async (data: any) => {
      if (data?.inDreamLand) {
        setResult({ ok: true, msg: data.roleGranted ? "Welcome — @member role granted." : "Welcome back." });
        await update({ inDreamLand: true });
        // Hard refresh so any downstream queries re-fetch with the new flag
        window.location.reload();
      } else {
        const reason = data?.reason ?? "NOT_IN_GUILD";
        const map: Record<string, string> = {
          NOT_IN_GUILD: "Discord still says you're not in DreamLand. Try the auto-add flow below.",
          CHECK_403:    "Bot lacks permission. Re-invite it with Manage Roles.",
          CHECK_401:    "Bot token invalid — reset it in the Discord dev portal.",
          BOT_TOKEN_MISSING: "Bot token is not configured. Set DISCORD_BOT_TOKEN in .env.bot and restart the server.",
          GUILD_ID_MISSING:  "DREAMLAND_GUILD_ID is empty in .env.bot.",
        };
        setResult({ ok: false, msg: map[reason] ?? `Reason: ${reason}` });
      }
    },
  });

  const autoAdd = () => {
    // The Discord `guilds.join` OAuth scope was already authorized on first
    // sign-in. Triggering signIn again re-runs events.signIn → ensureDream…
    // which PUTs them into the guild. With prompt=none this is silent.
    signIn("discord", { callbackUrl: "/app" });
  };

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-dl-accent/15 mb-5">
          <ShieldCheck className="w-7 h-7 text-dl-accent" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Join DreamLand to continue</h2>
        <p className="mt-3 text-dl-mute">
          DreamNote is a DreamLand community product. Confirm your membership
          to unlock your notes.
        </p>

        <div className="mt-7 grid gap-3">
          <button
            onClick={autoAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-dl-accent hover:opacity-90 transition px-5 py-3 font-medium"
          >
            <LogIn className="w-4 h-4" />
            Connect me to DreamLand
          </button>

          <button
            onClick={() => { setResult(null); verify.mutate(); }}
            disabled={verify.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-dl-line hover:bg-dl-line/40 transition px-5 py-3 text-sm"
          >
            {verify.isPending ? "Verifying…" : "I’m already a DreamLand member — re-check"}
          </button>
        </div>

        {result && (
          <div
            className={`mt-5 rounded-lg px-3 py-2 text-sm border ${
              result.ok
                ? "border-dl-accent2/30 bg-dl-accent2/10 text-dl-accent2"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {result.msg}
          </div>
        )}

        <p className="mt-6 text-xs text-dl-mute">
          Not a DreamLand member yet?{" "}
          <a
            href="https://discord.gg/dreamland"
            target="_blank"
            rel="noreferrer"
            className="text-dl-accent hover:underline"
          >
            Get an invite
          </a>{" "}
          first, then come back.
        </p>
      </div>
    </div>
  );
}
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DiscordIcon } from "@/components/DiscordIcon";
import { signInDiscord } from "@/app/actions/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/app");

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="max-w-xl w-full text-center">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-dl-mute mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-dl-accent2" />
          DreamLand · note app
        </div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">
          Write anything.<br />
          Keep <span className="text-dl-accent">everything</span>.
        </h1>
        <p className="mt-5 text-dl-mute">
          An Obsidian-style block editor with Notability-clean notes.
          Unlimited notes per account. Sign in with your DreamLand Discord — we&apos;ll
          bring you home automatically.
        </p>

        <form action={signInDiscord} className="mt-10">
          <button
            type="submit"
            className="group inline-flex items-center gap-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] transition px-6 py-3 text-base font-medium"
          >
            <DiscordIcon className="w-5 h-5" />
            Continue with Discord
          </button>
        </form>

        <p className="mt-4 text-xs text-dl-mute">
          New here? You&apos;ll be auto-added to the DreamLand server with the <b>@member</b> role.
        </p>
      </div>
    </main>
  );
}
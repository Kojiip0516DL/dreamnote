import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DiscordIcon } from "@/components/DiscordIcon";
import { signInDiscord, signOutUser } from "@/app/actions/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/app");
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <form action={signInDiscord}>
        <button type="submit" className="inline-flex items-center gap-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] transition px-6 py-3 text-base font-medium">
          <DiscordIcon className="w-5 h-5" /> Continue with Discord
        </button>
      </form>
      {session && (
        <form action={signOutUser}>
          <button className="mt-4 text-dl-mute text-sm">Sign out</button>
        </form>
      )}
    </main>
  );
}
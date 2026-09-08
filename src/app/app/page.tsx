import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import AppShell from "@/components/AppShell";
import JoinDreamLandGate from "@/components/JoinDreamLandGate";

export default async function AppPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  // If we don't yet know they're in DreamLand, hard-gate the editor.
  // No skip — DreamNote requires DreamLand membership.
  if (!session.user.inDreamLand) {
    return (
      <>
        <JoinDreamLandGate />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="fixed bottom-4 right-4 text-xs text-dl-mute"
        >
          <button className="hover:underline">Not me — sign out</button>
        </form>
      </>
    );
  }

  return (
    <AppShell
      user={{
        name: session.user.name ?? session.user.username,
        image: session.user.image ?? null,
        inDreamLand: true,
        discordId: session.user.discordId,
      }}
    />
  );
}
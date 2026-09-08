// Manual "join DreamLand" trigger — runs the same Discord flow as sign-in.
// Used by the JoinDreamLandGate UI when a user wants to retry without
// re-logging-in (e.g. they accidentally left the guild).
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDreamLandMembership } from "@/lib/discord-guild";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.discordId) {
    return NextResponse.json({ error: "no discord id on file" }, { status: 400 });
  }

  // Auth.js doesn't expose the raw access_token after first sign-in, so we
  // can't re-use the OAuth-user flow without a fresh sign-in. As a fallback
  // for users who already left and came back, we can only verify; we can't
  // auto-join them again. The UI tells them to sign out & back in.
  const result = await ensureDreamLandMembership(user.discordId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      inDreamLand: result.inGuild,
      dreamlandCheckedAt: new Date(),
    },
  });

  return NextResponse.json({
    inDreamLand: result.inGuild,
    addedNow: result.addedNow,
    roleGranted: result.roleGranted,
    reason: result.reason,
  });
}
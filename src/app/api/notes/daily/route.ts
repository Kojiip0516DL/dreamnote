import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Returns-or-creates today's daily note for the current user.
export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.note.findUnique({ where: { dailyFor: today } });
  if (existing && existing.userId === userId) return NextResponse.json(existing);

  const note = await prisma.note.create({
    data: {
      userId,
      title: today.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
      isDaily: true,
      dailyFor: today,
    },
  });
  return NextResponse.json(note);
}
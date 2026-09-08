import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });
  const notes = await prisma.note.findMany({
    where: { userId: (session.user as any).id ?? undefined },
    orderBy: [{ updatedAt: "desc" }],
  });
  // No app-level limit — unlimited per user.
  return NextResponse.json(notes);
}

const Create = z.object({
  title: z.string().optional(),
  folderId: z.string().optional().nullable(),
  isDaily: z.boolean().optional(),
  dailyFor: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data = Create.parse(body);
  const note = await prisma.note.create({
    data: {
      userId,
      title: data.title ?? "Untitled",
      folderId: data.folderId ?? null,
      isDaily: !!data.isDaily,
      dailyFor: data.dailyFor ? new Date(data.dailyFor) : null,
    },
  });
  return NextResponse.json(note);
}
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["title", "content", "plaintext", "wordCount", "folderId", "pinned", "trashed", "isDaily"]) {
    if (k in body) (data as any)[k] = body[k];
  }
  if ("trashedAt" in body) data.trashedAt = body.trashedAt ? new Date(body.trashedAt) : null;
  if ("dailyFor" in body)   data.dailyFor   = body.dailyFor   ? new Date(body.dailyFor)   : null;
  const updated = await prisma.note.update({ where: { id }, data: data as any });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
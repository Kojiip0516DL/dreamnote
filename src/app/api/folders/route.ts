import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json([], { status: 401 });
  const folders = await prisma.folder.findMany({
    where: { userId }, orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(folders);
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name, parentId } = await req.json();
  const folder = await prisma.folder.create({
    data: { userId, name: name || "New folder", parentId: parentId ?? null },
  });
  return NextResponse.json(folder);
}
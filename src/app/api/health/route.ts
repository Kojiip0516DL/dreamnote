// Health check endpoint for Vercel.
// Returns 200 if the app booted; 503 if Prisma is unreachable.
// Useful for: confirming Vercel deployment without going through Discord login.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {
    app: { ok: true },
  };

  // Try a simple DB query to verify DATABASE_URL works. If env vars are missing
  // or Prisma hasn't connected, this will throw — we surface that as 503.
  try {
    const t0 = Date.now();
    // Cheap query — count users is fine; returns 0 if empty.
    await prisma.user.count();
    checks.db = { ok: true, ms: Date.now() - t0 };
  } catch (err: any) {
    checks.db = { ok: false, error: (err?.message ?? String(err)).slice(0, 200) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    { ok: allOk, ms: Date.now() - started, checks, version: "0.1.0" },
    { status: allOk ? 200 : 503 },
  );
}

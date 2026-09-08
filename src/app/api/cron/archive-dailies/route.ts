// Daily-note auto-archive. Runs daily at 00:00 HKT (16:00 UTC).
// For every user, find daily notes whose dailyFor < start-of-yesterday,
// ensure a folder `Archive/YYYY-MM` exists for that month, and move the
// note into it. Idempotent: re-running on the same day is a no-op.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // Find any note that's a daily and more than 1 day old (in user's local
  // time). We use UTC days for simplicity — the visual timestamp in the
  // UI is local anyway, but the cutoff is uniform.
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - 1);  // yesterday UTC midnight

  const stale = await prisma.note.findMany({
    where: { isDaily: true, dailyFor: { lt: cutoff } },
    select: { id: true, userId: true, dailyFor: true, title: true },
  });
  if (stale.length === 0) return NextResponse.json({ moved: 0 });

  // Bucket by user; for each user, ensure Archive/YYYY-MM folders exist.
  const byUser = new Map<string, typeof stale>();
  for (const n of stale) {
    const arr = byUser.get(n.userId) ?? [];
    arr.push(n);
    byUser.set(n.userId, arr);
  }

  let moved = 0;
  for (const [userId, notes] of byUser) {
    // Group by YYYY-MM
    const buckets = new Map<string, typeof stale>();
    for (const n of notes) {
      if (!n.dailyFor) continue;
      const yyyymm = n.dailyFor.toISOString().slice(0, 7);
      const arr = buckets.get(yyyymm) ?? [];
      arr.push(n);
      buckets.set(yyyymm, arr);
    }

    for (const [yyyymm, list] of buckets) {
      const archiveFolder = await prisma.folder.upsert({
        where: { id: `archive-${userId}-${yyyymm}` },
        create: {
          id: `archive-${userId}-${yyyymm}`,
          userId,
          name: `Archive ${yyyymm}`,
          icon: "📦",
          order: -100, // sort first
        },
        update: {},
      });

      const updated = await prisma.note.updateMany({
        where: { id: { in: list.map((n) => n.id) } },
        data: { folderId: archiveFolder.id, pinned: false },
      });
      moved += updated.count;

      // Garbage-collect: any dailies that already had folderId=archive set
      // by a previous run are fine (idempotent — folderId stays the same).
      void archiveFolder; // satisfy the linter
    }
  }

  return NextResponse.json({ moved, checked: stale.length });
}

// Allow GET for manual cron-call from a developer / curl smoke-test.
export const GET = POST;
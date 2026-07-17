import { syncOnlineCourses } from '@/lib/msdb/sync-courses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/sync-courses
 * Mirror the MSDB online-course catalogue into the `courses` collection.
 * The Zone-A-only / Zone-B-preserving upsert logic lives in syncOnlineCourses().
 */
export async function POST(request) {
  // TODO(phase-2): replace with NextAuth admin session check.
  const secret = process.env.SYNC_SECRET;
  if (!secret || request.headers.get('x-sync-secret') !== secret) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { total, inserted, updated, orphanedLocal } =
      await syncOnlineCourses();

    if (orphanedLocal > 0) {
      // Left untouched (not deleted) to avoid orphaning quotation history.
      console.warn(
        `sync-courses: ${orphanedLocal} local course(s) not present upstream — left untouched.`
      );
    }

    return Response.json({ ok: true, total, inserted, updated });
  } catch (err) {
    console.error('sync-courses failed:', err);
    return Response.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}

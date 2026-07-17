'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/options';
import { dbConnect } from '@/lib/db/connect';
import Course from '@/models/Course';
import { syncOnlineCourses } from '@/lib/msdb/sync-courses';
import { courseZoneBSchema } from '@/lib/validation/course';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error('unauthorized');
  return session;
}

/**
 * Sync the catalogue from MSDB. Runs syncOnlineCourses() directly on the server
 * — the browser never POSTs to /api/admin/sync-courses, so the shared secret is
 * never exposed client-side. This action is protected by the admin session.
 */
export async function syncCoursesAction() {
  await requireAdmin();
  try {
    const { total, inserted, updated } = await syncOnlineCourses();
    revalidatePath('/admin/courses');
    return { ok: true, total, inserted, updated };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/**
 * Save Zone B (app-owned) fields for one course. Writes an EXPLICIT Zone B field
 * list — never a whole mapped object — so a stray Zone A write can't fight the
 * MSDB sync and corrupt the catalogue.
 */
export async function saveCourseAction(id, values) {
  await requireAdmin();
  const data = courseZoneBSchema.parse(values);

  await dbConnect();
  await Course.updateOne(
    { _id: id },
    {
      $set: {
        price: data.price,
        sellPrice: data.sellPrice,
        isPromotion: data.isPromotion,
        promotionStart: data.promotionStart ? new Date(data.promotionStart) : null,
        promotionEnd: data.promotionEnd ? new Date(data.promotionEnd) : null,
        notes: data.notes,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    }
  );

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${id}`);
  return { ok: true };
}

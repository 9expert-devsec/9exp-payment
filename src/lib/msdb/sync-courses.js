import { dbConnect } from '../db/connect.js';
import Course from '../../models/Course.js';
import { getOnlineCourses, toZoneA } from './online-courses.js';

/**
 * Core catalogue sync, shared by the API route and the verification script so
 * both exercise the identical upsert path.
 *
 * The one rule that matters most: a sync updates Zone A (the MSDB mirror) ONLY.
 * Zone B (price, sellPrice, isPromotion, promotion dates, notes, isActive,
 * sortOrder) is owned by this app and must survive every sync untouched. That
 * is enforced by an explicit `$set` field list for Zone A and `$setOnInsert`
 * for Zone B defaults — never `$set` a whole mapped object, which would clobber
 * Zone B and silently wipe every configured price and promotion.
 *
 * @returns {Promise<{total:number, inserted:number, updated:number, orphanedLocal:number}>}
 */
export async function syncOnlineCourses() {
  await dbConnect();

  const { items, total } = await getOnlineCourses();
  const now = new Date();

  const ops = items.map((item) => {
    const zoneA = toZoneA(item);
    return {
      updateOne: {
        filter: { msdbId: zoneA.msdbId },
        update: {
          // Zone A only — refreshed from upstream on every sync.
          $set: {
            courseCode: zoneA.courseCode,
            courseName: zoneA.courseName,
            coverUrl: zoneA.coverUrl,
            syncedAt: now,
          },
          // Zone B defaults — applied ONLY on first insert, never on update,
          // so existing prices/promotions are preserved.
          $setOnInsert: {
            msdbId: zoneA.msdbId,
            price: 0,
            sellPrice: 0,
            isPromotion: false,
            promotionStart: null,
            promotionEnd: null,
            notes: '',
            isActive: true,
            sortOrder: 0,
          },
        },
        upsert: true,
      },
    };
  });

  const result = ops.length
    ? await Course.bulkWrite(ops, { ordered: false })
    : { upsertedCount: 0, matchedCount: 0 };

  const inserted = result.upsertedCount || 0;
  // "updated" = existing courses matched by this sync (Zone A refreshed),
  // regardless of whether values actually changed.
  const updated = result.matchedCount || 0;

  // Courses that exist locally but were NOT in this upstream response are left
  // ALONE — not deleted. Deleting would orphan quotation history whose snapshot
  // referenced them. (isActive is Zone B, so we don't flip it here either.)
  const upstreamIds = items.map((i) => i._id);
  const orphanedLocal = await Course.countDocuments({
    msdbId: { $nin: upstreamIds },
  });

  return { total, inserted, updated, orphanedLocal };
}

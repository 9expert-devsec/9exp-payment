import { aiFetch, unwrap } from './client.js';

/**
 * Online courses from MSDB.
 *
 * The path is SINGULAR ("/online-course"), verified against the live API on
 * 2026-07-17 (returned total: 19). The integration guide's examples mix
 * singular and plural; only the singular form returns data.
 */
export async function getOnlineCourses() {
  const response = await aiFetch('/online-course');
  return unwrap(response); // { items, total }
}

/**
 * Map an upstream item to this app's Zone A (read-only mirror) shape.
 * ONLY these four fields are taken. Everything else upstream carries — notably
 * `o_course_price` and `o_course_netprice` — is deliberately ignored, because
 * all pricing is owned by this app (Course Zone B), not mirrored from MSDB.
 */
export function toZoneA(item) {
  return {
    msdbId: item._id,
    courseCode: item.o_course_id,
    courseName: item.o_course_name,
    coverUrl: item.o_course_cover_url,
  };
}

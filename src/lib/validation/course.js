import { z } from 'zod';

/**
 * Zone B (app-owned) course fields. Shared by the edit form (client, via
 * zodResolver) and the save server action (server) — one source of truth.
 *
 * Zone A fields (courseCode, courseName, coverUrl) are NOT here: they are
 * read-only mirrors of MSDB and must never be written by this app.
 *
 * Dates are "YYYY-MM-DD" strings from <input type="date"> (or '' when empty).
 * The "sellPrice > price" and "exactly one promotion date" cases are handled as
 * non-blocking warnings in the UI, so they are not encoded as hard errors here.
 */
export const courseZoneBSchema = z.object({
  price: z.coerce.number().min(0, 'ต้องไม่ติดลบ'),
  sellPrice: z.coerce.number().min(0, 'ต้องไม่ติดลบ'),
  isPromotion: z.boolean(),
  promotionStart: z.string().optional().default(''),
  promotionEnd: z.string().optional().default(''),
  notes: z.string().max(1000, 'ยาวเกินไป').optional().default(''),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int('ต้องเป็นจำนวนเต็ม'),
});

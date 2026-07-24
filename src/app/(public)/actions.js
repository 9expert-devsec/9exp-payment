'use server';

import { headers } from 'next/headers';
import { createQuotation } from '@/lib/quotation-create';

/**
 * Best-effort client IP. Vercel sits behind a proxy, so the socket address is
 * the proxy's — x-forwarded-for's FIRST entry is the original client. Stored for
 * abuse triage only; never used for authorisation.
 */
async function clientIp() {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') || '';
}

/**
 * Create a quotation from the public form.
 *
 * Thin wrapper: the request-bound concern (the client IP) is resolved here, and
 * everything else — validation, the course lookup, pricing, the snapshot and the
 * numbering — lives in src/lib/quotation-create.js so it stays testable without
 * a running server. All of it still runs server-side.
 */
export async function createQuotationAction(values) {
  try {
    const ipAddress = await clientIp();
    return await createQuotation(values, { ipAddress });
  } catch (err) {
    console.error('createQuotationAction failed:', err);
    return { ok: false, error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' };
  }
}

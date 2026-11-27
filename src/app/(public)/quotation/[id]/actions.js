'use server';

import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db/connect';
import Quotation from '@/models/Quotation';
import { auth } from '@/lib/auth/options';
import { canViewQuotation } from '@/lib/quotation-access';
import { reserveResend } from '@/lib/email/resend-policy';
import { sendQuotationEmail } from '@/lib/email/send-quotation-email';

/**
 * Customer "ส่งอีเมลอีกครั้ง" from the success page.
 *
 * - Access: the same rule as the page itself (token, or an admin session). A
 *   missing/wrong token is answered exactly like a missing id ('not-found').
 * - Recipient: always the STORED coordinator email; nothing from the client.
 * - Limits: max 3 customer resends per quotation, 120s between attempts —
 *   claimed atomically in reserveResend().
 *
 * Runs the send inline (not after()) so the reply says what really happened.
 * The page exports maxDuration = 60 for the Chromium render.
 *
 * @returns {Promise<{ok: boolean, code: 'sent'|'wait'|'limit'|'failed'|'not-found'}>}
 */
export async function resendQuotationEmailAction(id, token) {
  try {
    if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
      return { ok: false, code: 'not-found' };
    }
    await dbConnect();
    const doc = await Quotation.findById(id, { publicToken: 1 }).lean();
    if (!doc) return { ok: false, code: 'not-found' };

    const session = await auth();
    if (!canViewQuotation(doc, typeof token === 'string' ? token : undefined, session)) {
      return { ok: false, code: 'not-found' };
    }

    const claim = await reserveResend(id, { customer: true });
    if (!claim.ok) return { ok: false, code: claim.code };

    const result = await sendQuotationEmail(id, { trigger: 'resend-customer' });
    return result.ok ? { ok: true, code: 'sent' } : { ok: false, code: 'failed' };
  } catch (err) {
    console.error('resendQuotationEmailAction failed:', String(err?.message || err));
    return { ok: false, code: 'failed' };
  }
}

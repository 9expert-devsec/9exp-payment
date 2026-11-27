'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth/options';
import { reserveResend } from '@/lib/email/resend-policy';
import { sendQuotationEmail } from '@/lib/email/send-quotation-email';

/**
 * Admin "ส่งอีกครั้ง". Requires an admin session. No customer cap, but the
 * same 120s spacing between attempts. Always sends to the stored coordinator.
 *
 * @returns {Promise<{ok: boolean, code: 'sent'|'wait'|'failed'|'skipped'|'not-found'|'unauthorized'}>}
 */
export async function adminResendQuotationEmailAction(id) {
  const session = await auth();
  if (!session?.user) return { ok: false, code: 'unauthorized' };
  try {
    if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
      return { ok: false, code: 'not-found' };
    }
    const claim = await reserveResend(id, { customer: false });
    if (!claim.ok) return { ok: false, code: claim.code };

    const result = await sendQuotationEmail(id, { trigger: 'resend-admin' });
    revalidatePath('/admin/quotations');
    if (result.ok) return { ok: true, code: 'sent' };
    return { ok: false, code: result.status === 'skipped' ? 'skipped' : 'failed' };
  } catch (err) {
    console.error('adminResendQuotationEmailAction failed:', String(err?.message || err));
    return { ok: false, code: 'failed' };
  }
}

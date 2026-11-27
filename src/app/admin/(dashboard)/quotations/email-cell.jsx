'use client';

import { useState } from 'react';
import { adminResendQuotationEmailAction } from './actions';

const PILL = {
  sent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  pending: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  skipped: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

const LABEL = {
  sent: 'ส่งแล้ว',
  pending: 'รอส่ง',
  failed: 'ส่งไม่สำเร็จ',
  skipped: 'ข้าม (ไม่มี token)',
};

const RESULT = {
  sent: 'ส่งแล้ว',
  wait: 'รอ 2 นาทีก่อนส่งอีกครั้ง',
  failed: 'ส่งไม่สำเร็จ',
  skipped: 'ไม่ได้ตั้งค่า Postmark',
  'not-found': 'ไม่พบใบเสนอราคา',
  unauthorized: 'กรุณาเข้าสู่ระบบ',
};

/**
 * Admin quotations list — "อีเมล" cell: status pill + "ส่งอีกครั้ง".
 * `sentLabel` is the pre-formatted (server-side) send date.
 */
export function EmailCell({ id, status, sentLabel, error }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const key = PILL[status] ? status : 'pending';

  async function onResend() {
    setPending(true);
    setResult(null);
    try {
      const r = await adminResendQuotationEmailAction(id);
      setResult(RESULT[r?.code] || RESULT.failed);
    } catch {
      setResult(RESULT.failed);
    }
    setPending(false);
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span
        title={key === 'failed' && error ? error : undefined}
        className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${PILL[key]}`}
      >
        {LABEL[key]}
        {key === 'sent' && sentLabel ? ` · ${sentLabel}` : ''}
      </span>
      <button
        type="button"
        onClick={onResend}
        disabled={pending}
        className="whitespace-nowrap text-xs text-[var(--9e-action)] hover:underline disabled:opacity-50"
      >
        {pending ? 'กำลังส่ง…' : 'ส่งอีกครั้ง'}
      </button>
      {result ? <span className="text-xs text-[var(--text-muted)]">{result}</span> : null}
    </div>
  );
}

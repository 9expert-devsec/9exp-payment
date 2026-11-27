'use client';

import { useState } from 'react';
import { PUBLIC_EMAIL } from '@/lib/public-contact';
import { SecondaryButton } from '@/components/public/ui';
import { SpinnerIcon } from '@/components/public/icons';
import { resendQuotationEmailAction } from './actions';

const MESSAGES = {
  sent: { tone: 'success', text: 'ส่งอีเมลอีกครั้งแล้ว' },
  wait: { tone: 'warning', text: 'กรุณารอสักครู่ก่อนส่งอีกครั้ง' },
  limit: { tone: 'warning', text: `ส่งซ้ำครบจำนวนแล้ว กรุณาติดต่อ ${PUBLIC_EMAIL}` },
  failed: { tone: 'danger', text: 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่ภายหลัง' },
};

const TONES = {
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  danger: 'text-[var(--danger)]',
};

/** "ส่งอีเมลอีกครั้ง" + its inline result line. */
export function ResendButton({ id, token, className }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(null);

  async function onClick() {
    setPending(true);
    setMessage(null);
    try {
      const result = await resendQuotationEmailAction(id, token);
      setMessage(MESSAGES[result?.code] || MESSAGES.failed);
    } catch {
      setMessage(MESSAGES.failed);
    }
    setPending(false);
  }

  return (
    <div className={className}>
      <SecondaryButton onClick={onClick} disabled={pending}>
        {pending ? <SpinnerIcon /> : null}
        ส่งอีเมลอีกครั้ง
      </SecondaryButton>
      {message ? (
        <p role="status" className={`mt-2 text-center text-sm ${TONES[message.tone]}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

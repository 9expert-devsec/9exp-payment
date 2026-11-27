'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { CloseIcon } from './icons';

/**
 * Bottom sheet for the mobile layout: navy scrim at 55%, drag handle, title
 * with a close button. Closes on scrim tap or Esc, and locks body scroll while
 * open. Rendered into document.body so a sticky/transformed ancestor cannot
 * clip it. Only mount it while open (the parent controls that).
 */
export function BottomSheet({ title, onClose, footer, className, children }) {
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="ปิด"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(13,27,42,0.55)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[88vh] flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(13,27,42,0.16)]',
          className
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <h2 className="font-thai text-lg font-bold text-[var(--text-primary)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer ? (
          <div className="border-t border-[var(--surface-border)] bg-white px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

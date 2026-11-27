import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, InfoIcon } from './icons';

/*
  Public-surface form primitives. Separate from src/components/ui/* on purpose:
  the admin uses those, and the public design (48px fields, 16px text, brand
  focus ring) would change the admin's look. Light theme only.
*/

// Shared field chrome: 48px, radius 10, 1px border, 14px padding, 16px text
// (16px also stops iOS Safari zooming on focus). Focus draws a 2px brand border
// as an inset shadow so the box does not shift by a pixel.
const fieldBase = cn(
  'w-full rounded-[10px] border border-[var(--surface-border)] bg-white px-3.5 text-base text-[var(--text-primary)]',
  'placeholder:text-[var(--text-muted)]',
  'transition-[border-color,box-shadow] duration-[var(--motion-micro)]',
  'focus:outline-none focus:border-[var(--9e-brand)] focus:shadow-[inset_0_0_0_1px_var(--9e-brand),0_0_0_4px_rgba(36,134,255,0.18)]',
  'aria-[invalid=true]:border-[var(--danger)] aria-[invalid=true]:focus:shadow-[inset_0_0_0_1px_var(--danger),0_0_0_4px_rgba(229,72,77,0.15)]',
  'read-only:bg-[var(--surface-muted)] read-only:text-[var(--text-secondary)]',
  'disabled:cursor-not-allowed disabled:opacity-60'
);

export const PublicInput = forwardRef(function PublicInput(
  { className, invalid, type = 'text', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid ? 'true' : undefined}
      className={cn(fieldBase, 'h-12', className)}
      {...props}
    />
  );
});

export const PublicSelect = forwardRef(function PublicSelect(
  { className, invalid, children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid ? 'true' : undefined}
        className={cn(fieldBase, 'h-12 appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]" />
    </div>
  );
});

export const PublicTextarea = forwardRef(function PublicTextarea(
  { className, invalid, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid ? 'true' : undefined}
      className={cn(fieldBase, 'min-h-[104px] py-3', className)}
      {...props}
    />
  );
});

/** Native checkbox, 20px, tinted with the action colour. */
export const PublicCheckbox = forwardRef(function PublicCheckbox(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-5 w-5 shrink-0 cursor-pointer rounded accent-[var(--9e-action)]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(36,134,255,0.18)]',
        className
      )}
      {...props}
    />
  );
});

/** Label (Medium 14) with an optional red required star. */
export function FieldLabel({ htmlFor, required, children, className }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-sm font-medium text-[var(--text-primary)]', className)}
    >
      {children}
      {required ? <span className="ml-0.5 text-[var(--danger)]">*</span> : null}
    </label>
  );
}

/** 12px danger helper under a field. Renders nothing without a message. */
export function FieldError({ error, id }) {
  const message = typeof error === 'string' ? error : error?.message;
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-[var(--danger)]">
      {message}
    </p>
  );
}

/** Label + control + error, the layout every public field uses. */
export function Field({ id, label, required, error, hint, className, children }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label ? (
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
      ) : null}
      {children}
      {hint && !error ? (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
      <FieldError error={error} />
    </div>
  );
}

/**
 * Section card: white, radius 16, 1px border. Header = 32px numbered badge,
 * title and optional subtitle.
 */
export function SectionCard({ id, number, title, subtitle, className, children }) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-6 rounded-2xl border border-[var(--surface-border)] bg-white px-4 py-5 lg:p-7',
        className
      )}
    >
      <header className="mb-5 flex items-center gap-3 lg:mb-6">
        {number != null ? (
          <span className="font-en flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-tint)] text-sm font-semibold text-[var(--9e-action)]">
            {number}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-thai text-sm font-bold text-[var(--text-primary)] lg:text-lg">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Small pill chip. */
export function Chip({ tone = 'neutral', className, children }) {
  const tones = {
    neutral: 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--surface-border)]',
    success: 'bg-[var(--success-bg)] text-[var(--success)]',
    brand: 'bg-white text-[var(--9e-action)] border border-[var(--brand-tint)]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Amber notice with an info icon (the VAT notice). */
export function WarningNote({ className, children }) {
  return (
    <div
      className={cn(
        'flex gap-2 rounded-xl bg-[var(--warning-bg)] px-3.5 py-3 text-xs leading-relaxed text-[var(--warning)]',
        className
      )}
    >
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

/** Inline danger alert (form-level errors). */
export function DangerAlert({ className, children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-[var(--danger)] bg-[#fdecec] px-3.5 py-3 text-sm text-[var(--danger)]',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Primary 52px button (radius 12, action blue). */
export function PrimaryButton({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'font-thai inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--9e-action)] px-6 text-base font-bold text-white',
        'transition-colors duration-[var(--motion-micro)] hover:bg-[#004fe0]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(36,134,255,0.3)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Secondary outlined 52px button. */
export function SecondaryButton({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'font-thai inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-white px-6 text-base font-bold text-[var(--text-primary)]',
        'transition-colors duration-[var(--motion-micro)] hover:bg-[var(--surface-muted)]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(36,134,255,0.3)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

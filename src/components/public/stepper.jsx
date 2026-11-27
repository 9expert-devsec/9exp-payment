import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon } from './icons';

export const STEPS = ['กรอกข้อมูล', 'ตรวจสอบใบเสนอราคา', 'รับใบเสนอราคา'];

/**
 * Desktop stepper. `current` is 1-based; a value above STEPS.length marks every
 * step done (the success page).
 */
export function Stepper({ current, className }) {
  return (
    <ol className={cn('flex items-center gap-3', className)} aria-label="ขั้นตอน">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <Fragment key={label}>
            {i > 0 ? (
              <li
                aria-hidden="true"
                className={cn(
                  'h-0.5 w-10 shrink-0 rounded',
                  n <= current ? 'bg-[var(--success)]' : 'bg-[var(--border-strong)]'
                )}
              />
            ) : null}
            <li
              className="flex items-center gap-2.5"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={cn(
                  'font-en flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  done && 'bg-[var(--success)] text-white',
                  active && 'bg-[var(--9e-action)] text-white',
                  !done && !active &&
                    'bg-white text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border-strong)]'
                )}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : n}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-sm',
                  active && 'font-bold text-[var(--text-primary)]',
                  done && 'text-[var(--text-primary)]',
                  !done && !active && 'text-[var(--text-muted)]'
                )}
              >
                {label}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

/** Mobile progress block: "ขั้นตอนที่ N จาก 3", current label, three bars. */
export function MobileProgress({ current, className }) {
  const label = STEPS[Math.min(current, STEPS.length) - 1];
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-secondary)]">
          ขั้นตอนที่ {Math.min(current, STEPS.length)} จาก {STEPS.length}
        </span>
        <span className="font-medium text-[var(--9e-action)]">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => {
          const n = i + 1;
          return (
            <span
              key={s}
              className={cn(
                'h-1 rounded-full',
                n < current && 'bg-[var(--success)]',
                n === current && 'bg-[var(--9e-action)]',
                n > current && 'bg-[var(--surface-border)]'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

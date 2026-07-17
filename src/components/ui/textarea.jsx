import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-[var(--radius-md)] border border-[var(--surface-border)]',
        'bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]',
        'placeholder:text-[var(--text-muted)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--9e-action)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--page-bg)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}

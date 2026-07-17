import { cn } from '@/lib/utils';

// Minimal shadcn-style button. Owned source, not a dependency.
// Variants consume semantic tokens so they work in both themes.
const variants = {
  primary:
    'bg-[var(--9e-action)] text-white hover:bg-[var(--9e-brand)] disabled:opacity-50',
  outline:
    'border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]',
  ghost:
    'text-[var(--text-primary)] hover:bg-[var(--surface-muted)]',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-9 w-9',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium',
        'transition-colors duration-[var(--motion-micro)] ease-[var(--ease-9e)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--9e-action)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)]',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

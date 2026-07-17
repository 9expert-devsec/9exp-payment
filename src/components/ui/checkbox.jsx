import { cn } from '@/lib/utils';

// Native checkbox styled to match — avoids pulling in Radix for an internal panel.
// `accent-color` tints the native control with the brand action color.
export function Checkbox({ className, ...props }) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-[var(--surface-border)] accent-[var(--9e-action)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--9e-action)] focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}

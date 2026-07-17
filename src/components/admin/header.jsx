import { ThemeToggle } from './theme-toggle';
import { logoutAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';

// Server component. Receives the current admin's name; the toggle and logout
// are interactive (toggle is a client component, logout is a form → server action).
export function Header({ adminName }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)] px-4">
      <div className="text-lg font-bold text-[var(--9e-brand)] md:hidden">9Expert</div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--text-secondary)]">{adminName}</span>
        <ThemeToggle />
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            ออกจากระบบ
          </Button>
        </form>
      </div>
    </header>
  );
}

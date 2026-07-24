/**
 * Shell for the public (customer-facing) surface. Separate from the admin
 * layout: no sidebar, no session, no theme toggle — a customer arriving from an
 * email link gets a plain branded page.
 *
 * The root layout's <title> says "— Admin", so every public page sets its own.
 */
export default function PublicLayout({ children }) {
  return (
    <div className="flex min-h-full flex-col bg-[var(--page-bg-muted)]">
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <span className="text-lg font-bold text-[var(--9e-brand)]">9Expert</span>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--surface-border)] bg-[var(--surface)] py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-[var(--text-muted)]">
          บริษัท นายน์เอ็กซ์เพิร์ท จำกัด · โทร 02-219-4304 · training@9expert.co.th
        </div>
      </footer>
    </div>
  );
}

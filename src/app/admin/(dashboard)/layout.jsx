import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/options';
import { Sidebar, MobileNav } from '@/components/admin/sidebar';
import { Header } from '@/components/admin/header';

/**
 * Protected admin shell. Lives in the (dashboard) route group so it does NOT
 * wrap /admin/login — wrapping the login page with an auth()-gated layout would
 * cause an infinite redirect loop. Middleware is the first gate; this auth()
 * check is defense-in-depth and provides the admin identity for the header.
 */
export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  return (
    <div className="flex min-h-screen bg-[var(--page-bg-muted)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header adminName={session.user.name || session.user.email} />
        <MobileNav />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

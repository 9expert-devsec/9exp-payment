// NOTE: Next 16 prints a deprecation warning suggesting a rename to `proxy.js`.
// Do NOT rename it. `proxy` forces the Node runtime and drops Edge support, which
// would defeat the whole point of the edge-safe config.js / node options.js split
// (the auth gate is meant to run on Edge). Deliberate choice — revisit after Phase 4.
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';

// Build an Edge-safe auth instance from the EDGE-SAFE config only. This must not
// pull in options.js (which imports Mongoose/bcrypt) or middleware breaks on Edge.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isOnLogin = nextUrl.pathname.startsWith('/admin/login');

  // The login page must stay reachable when signed out.
  if (isOnLogin) {
    // Already signed in? Skip the login page.
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/admin/courses', nextUrl));
    }
    return NextResponse.next();
  }

  // Any other /admin/* path requires a session.
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/admin/login', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Only guard the admin surface. (Excludes /api, static assets, etc.)
  matcher: ['/admin/:path*'],
};

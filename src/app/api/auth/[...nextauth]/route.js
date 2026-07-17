import { handlers } from '@/lib/auth/options';

// NextAuth v5 route handlers (Node runtime — options.js imports Mongoose).
export const runtime = 'nodejs';
export const { GET, POST } = handlers;

'use server';

import { signOut } from './options';

/** Sign out and return to the login page. */
export async function logoutAction() {
  await signOut({ redirectTo: '/admin/login' });
}

import { redirect } from 'next/navigation';

// Bare /admin → the default admin landing. (Middleware gates this to /admin/login
// when signed out; when signed in it falls through to the courses list.)
export default function AdminIndex() {
  redirect('/admin/courses');
}

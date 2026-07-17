import { LoginForm } from './login-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata = {
  title: 'เข้าสู่ระบบ — 9Expert Admin',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg-muted)] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 text-2xl font-bold text-[var(--9e-brand)]">
            9Expert
          </div>
          <CardTitle className="font-[family-name:var(--font-thai)]">
            ระบบจัดการใบเสนอราคา
          </CardTitle>
          <CardDescription>เข้าสู่ระบบสำหรับผู้ดูแล</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}

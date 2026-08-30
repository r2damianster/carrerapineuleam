import { redirect } from 'next/navigation';

export default function AdminLoginRedirect({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const target = searchParams.redirect || '/admin/dashboard';
  redirect(`/portal/login?redirect=${encodeURIComponent(target)}`);
}

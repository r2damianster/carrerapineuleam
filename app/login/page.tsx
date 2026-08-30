import { redirect } from 'next/navigation';

export default function LoginRedirect({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const target = searchParams.redirect || '/';
  redirect(`/portal/login?redirect=${encodeURIComponent(target)}`);
}

import { redirect } from 'next/navigation';

export default async function HomePage(props: {
  params: Promise<{ locale: string }>
}) {
  // Get the params first
  const params = await props.params;

  // Now we can safely access the locale property
  const locale = params.locale;

  redirect(`/${locale}/dashboard`);
}
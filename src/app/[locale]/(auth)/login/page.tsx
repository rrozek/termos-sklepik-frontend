"use client";

import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const t = useTranslations();

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('auth.login.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('auth.login.description')}
          </p>
        </div>

        <LoginForm />

        <p className="px-8 text-center text-sm text-muted-foreground">
          {t('auth.login.noAccount')}{' '}
          <Link href="/register" className="underline underline-offset-4 hover:text-primary">
            {t('auth.login.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
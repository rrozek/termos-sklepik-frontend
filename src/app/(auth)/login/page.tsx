"use client";

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { defaultLocale } from '../../../../i18n/settings';

export default function LoginPage() {
  useEffect(() => {
    // Przekieruj do strony logowania z lokalizacją
    redirect(`/${defaultLocale}/login`);
  }, []);

  // Ten komponent nigdy nie powinien być wyrenderowany, ale na wszelki wypadek
  return null;
}
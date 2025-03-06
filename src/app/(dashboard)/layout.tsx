"use client";

import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1 flex">
          <Sidebar />
          <main className="flex-1 md:ml-64 pt-16">
            <div className="container p-6 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </AuthProvider>
  );
}
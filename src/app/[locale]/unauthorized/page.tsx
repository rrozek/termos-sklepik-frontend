'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-red-50 text-red-900 rounded-full p-4 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-12 h-12"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold mb-2">Access Denied</h1>

      <p className="text-gray-600 mb-6 text-center max-w-md">
        You don't have permission to access this page. This might be because your role
        ({user?.role || 'unknown'}) doesn't have the required permissions.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Go to Dashboard
        </Button>

        <Button
          variant="default"
          onClick={logout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
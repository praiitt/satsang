'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/components/auth/auth-provider';
import { LogoutButton } from '@/components/auth/logout-button';
import { PhoneAuthForm } from '@/components/auth/phone-auth-form';

export default function TestAuthPage() {
  // AuthProvider is now at root level in app/layout.tsx
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <AuthGuard
        fallback={
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-gray-900">Test Authentication</h1>
              <p className="mt-2 text-sm text-gray-600">
                Use Firebase test credentials: +91 84540 83097 / OTP: 123456
              </p>
            </div>
            <PhoneAuthForm />
          </div>
        }
      >
        <AuthSuccessView />
      </AuthGuard>
    </div>
  );
}

function AuthSuccessView() {
  const { user } = useAuth();

  return (
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-800">
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Authentication Successful!</h2>
      </div>
      <div className="space-y-3 rounded-lg bg-gray-50 p-4">
        <div>
          <span className="text-sm font-medium text-gray-500">User ID:</span>
          <p className="text-gray-900">{user?.uid}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">Phone Number:</span>
          <p className="text-gray-900">{user?.phoneNumber || 'N/A'}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-500">Email:</span>
          <p className="text-gray-900">{user?.email || 'N/A'}</p>
        </div>
      </div>
      <div className="mt-6">
        <LogoutButton className="w-full" />
      </div>
    </div>
  );
}

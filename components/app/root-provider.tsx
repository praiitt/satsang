'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { LanguageProvider } from '@/contexts/language-context';

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  );
}

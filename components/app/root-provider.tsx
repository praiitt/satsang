'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { LanguageProvider } from '@/contexts/language-context';
import { UserDataProvider } from '@/components/providers/user-data-provider';
import { MusicPlayerProvider } from '@/contexts/music-player-context';
import { LanguageSelectorModal } from '@/components/ui/language-selector-modal';

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <LanguageSelectorModal />
      <AuthProvider>
        <UserDataProvider>
          <MusicPlayerProvider>
            {children}
          </MusicPlayerProvider>
        </UserDataProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

'use client';

import { RoomAudioRenderer, StartAudio } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { SessionProvider } from '@/components/app/session-provider';
import { ViewController } from '@/components/app/view-controller';
import { AuthProvider } from '@/components/auth/auth-provider';
import { HeygenAvatarPlayer } from '@/components/heygen/heygen-avatar-player';
import { Toaster } from '@/components/livekit/toaster';
import { PWAInstaller } from '@/components/pwa-installer';

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  return (
    <AuthProvider>
      <SessionProvider appConfig={appConfig}>
        <main className="min-h-svh w-full overflow-y-auto">
          <ViewController />
        </main>
        <StartAudio label="Start Audio" />
        <RoomAudioRenderer />
        {appConfig.enableHeygenAvatar ? <HeygenAvatarPlayer /> : null}
        {/* YouTube bhajan player is in SessionView (inside RoomContext) */}
        <Toaster />
        <PWAInstaller />
      </SessionProvider>
    </AuthProvider>
  );
}

// import { BottomNav } from '@/components/app/bottom-nav';
import { FloatingPlayer } from '@/components/rraasi-music/floating-player';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  return (
    <>
      {/* Header removed - using SiteHeader from root layout instead */}
      {children}

      {/* Floating Music Player */}
      <FloatingPlayer />

      {/* Mobile bottom navigation - Commented out for now, will be enabled when other features are added */}
      {/* <BottomNav /> */}
    </>
  );
}

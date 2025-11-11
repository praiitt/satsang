// import { BottomNav } from '@/components/app/bottom-nav';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  return (
    <>
      {/* Header removed - using SiteHeader from root layout instead */}
      {children}

      {/* Mobile bottom navigation - Commented out for now, will be enabled when other features are added */}
      {/* <BottomNav /> */}
    </>
  );
}

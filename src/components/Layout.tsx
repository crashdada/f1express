import { ReactNode } from 'react';
import Navigation from './Navigation';
import BottomNav from './BottomNav';
import { Capacitor } from '@capacitor/core';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isAndroidShell = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  return (
    <div
      className={`min-h-screen bg-bg-primary pt-[env(safe-area-inset-top)] ${isAndroidShell
        ? 'android-shell pb-[calc(6.5rem+env(safe-area-inset-bottom))]'
        : 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0'
        }`}
    >
      <Navigation />
      <main className={`transition-opacity duration-300 ${isAndroidShell ? 'pt-20 pb-6' : 'pt-16'} md:pt-16 md:pb-0`}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;

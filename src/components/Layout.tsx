import { ReactNode } from 'react';
import Navigation from './Navigation';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-bg-primary pb-16 md:pb-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Navigation />
      <main className="pt-16 pb-16 md:pb-0 transition-opacity duration-300">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;

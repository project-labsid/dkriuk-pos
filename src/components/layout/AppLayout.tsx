'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavStore } from '@/store';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import MobileNav from './MobileNav';
import ProfileDialog from '@/features/auth/ProfileDialog';

interface AppLayoutProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function AppLayout({ children }: AppLayoutProps) {
  const { currentPage } = useNavStore();
  const [profileOpen, setProfileOpen] = useState(false);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw/sw.js').catch(() => {});
    }
  }, []);

  const handleOpenProfile = useCallback(() => setProfileOpen(true), []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <AppSidebar />

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader onOpenProfile={handleOpenProfile} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 md:pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Profile dialog */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

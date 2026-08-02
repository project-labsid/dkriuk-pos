'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  MoreHorizontal,
  FolderOpen,
  Users,
  Truck,
  Receipt,
  Warehouse,
  Store,
  Percent,
  GitBranch,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavStore, useAuthStore } from '@/store';
import type { PageName, UserRole } from '@/types';

interface MobileNavItem {
  label: string;
  page: PageName;
  icon: React.ElementType;
}

interface MobileNavSection {
  title: string;
  items: MobileNavItem[];
  roles: UserRole[];
}

const bottomNavItems: MobileNavItem[] = [
  { label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
  { label: 'Kasir', page: 'pos', icon: ShoppingCart },
  { label: 'Produk', page: 'products', icon: Package },
  { label: 'Laporan', page: 'reports', icon: BarChart3 },
];

const moreSections: MobileNavSection[] = [
  {
    title: 'Master Data',
    roles: ['super_admin', 'admin'],
    items: [
      { label: 'Kategori', page: 'categories', icon: FolderOpen },
      { label: 'Pelanggan', page: 'customers', icon: Users },
      { label: 'Supplier', page: 'suppliers', icon: Truck },
    ],
  },
  {
    title: 'Transaksi',
    roles: ['super_admin', 'admin', 'cashir'],
    items: [
      { label: 'Riwayat Transaksi', page: 'transactions', icon: Receipt },
      { label: 'Pembelian', page: 'purchases', icon: Truck },
      { label: 'Manajemen Stok', page: 'stock', icon: Warehouse },
    ],
  },
  {
    title: 'Pengaturan',
    roles: ['super_admin', 'admin'],
    items: [
      { label: 'Pengaturan Toko', page: 'settings', icon: Store },
      { label: 'Pajak & Service Charge', page: 'tax-settings', icon: Percent },
    ],
  },
  {
    title: 'Administrasi',
    roles: ['super_admin'],
    items: [
      { label: 'Cabang', page: 'branches', icon: GitBranch },
      { label: 'Pengguna', page: 'users', icon: UserCog },
    ],
  },
];

export default function MobileNav() {
  const { currentPage, setCurrentPage } = useNavStore();
  const { user } = useAuthStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const role = (user?.role || 'cashir') as UserRole;

  const visibleBottomItems = bottomNavItems.filter((item) => {
    if (item.page === 'reports' && role === 'cashir') return false;
    if (item.page === 'products' && role === 'cashir') return false;
    return true;
  });

  const filteredMoreSections = moreSections.filter((s) => s.roles.includes(role));

  function handleNav(page: PageName) {
    setCurrentPage(page);
    setMoreOpen(false);
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {visibleBottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => handleNav(item.page)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative',
                  'transition-colors duration-150',
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight">Lainnya</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-xl max-h-[80vh]">
          <SheetHeader className="text-left">
            <SheetTitle>Menu Lainnya</SheetTitle>
          </SheetHeader>
          <ScrollArea className="max-h-[60vh] -mx-4 px-4">
            <div className="space-y-4 pb-4">
              {filteredMoreSections.map((section) => (
                <div key={section.title}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-3">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.page;
                      return (
                        <button
                          key={item.page}
                          onClick={() => handleNav(item.page)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                            'hover:bg-accent',
                            isActive
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'text-foreground/70'
                          )}
                        >
                          <Icon className="w-[18px] h-[18px] shrink-0" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

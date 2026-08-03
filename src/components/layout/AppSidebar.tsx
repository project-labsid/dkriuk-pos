'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderOpen,
  Users,
  Truck,
  Receipt,
  Warehouse,
  BarChart3,
  Store,
  Percent,
  GitBranch,
  UserCog,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavStore, useAuthStore, useSettingsStore } from '@/store';
import type { PageName, UserRole } from '@/types';

interface NavItem {
  label: string;
  page: PageName;
  icon: React.ElementType;
  roles?: UserRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
  roles: UserRole[];
}

const navSections: NavSection[] = [
  {
    title: 'Menu Utama',
    roles: ['super_admin', 'admin', 'cashir'],
    items: [
      { label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin'] },
      { label: 'Kasir (POS)', page: 'pos', icon: ShoppingCart },
    ],
  },
  {
    title: 'Master Data',
    roles: ['super_admin', 'admin'],
    items: [
      { label: 'Produk', page: 'products', icon: Package },
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
    title: 'Laporan',
    roles: ['super_admin', 'admin'],
    items: [
      { label: 'Laporan', page: 'reports', icon: BarChart3 },
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

// Cashier-restricted transaksi section
const cashierTransaksiItems: NavItem[] = [
  { label: 'Riwayat Transaksi', page: 'transactions', icon: Receipt },
];

export default function AppSidebar() {
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useNavStore();
  const { user, logout } = useAuthStore();
  const { storeName } = useSettingsStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) {
        // sidebar handled by AppLayout on mobile
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [sidebarOpen]);

  const role = (user?.role || 'cashir') as UserRole;

  function getFilteredSections(): NavSection[] {
    const sections: NavSection[] = [];

    for (const section of navSections) {
      if (section.roles.includes(role)) {
        // Special handling: cashier only sees certain items in Transaksi
        // Filter items that have specific role restrictions
        const filteredItems = section.items.filter(item => {
          if (item.roles && !item.roles.includes(role)) return false;
          return true;
        });

        // Skip empty sections
        if (filteredItems.length === 0) continue;

        // Special handling: cashier only sees certain items in Transaksi
        if (section.title === 'Transaksi' && role === 'cashir') {
          sections.push({
            ...section,
            items: cashierTransaksiItems,
          });
        } else {
          sections.push({
            ...section,
            items: filteredItems,
          });
        }
      }
    }

    // Cashier should see a transaksi section with only riwayat
    if (role === 'cashir' && !sections.find(s => s.title === 'Transaksi')) {
      sections.push({
        title: 'Transaksi',
        roles: ['cashir'],
        items: cashierTransaksiItems,
      });
    }

    return sections;
  }

  const filteredSections = getFilteredSections();

  function handleNav(page: PageName) {
    setCurrentPage(page);
    if (isMobile) {
      setSidebarOpen(false);
    }
  }

  function handleLogout() {
    logout();
    setSidebarOpen(false);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 py-5 shrink-0">
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
          <img src="/logo.png" alt="Dkriuk" className="w-full h-full object-cover" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h2 className="font-bold text-base leading-tight">{storeName || 'Dkriuk'}</h2>
              <p className="text-xs text-muted-foreground">Point of Sale</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 px-3 py-3">
        <nav className="space-y-5">
          {filteredSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.page;
                  return (
                    <button
                      key={item.page}
                      onClick={() => handleNav(item.page)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                        isActive
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white shadow-sm'
                          : 'text-foreground/70'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User info + logout */}
      <div className="shrink-0 p-3 space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="w-8 h-8">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                {user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">
                {role === 'cashir' ? 'Kasir' : role === 'admin' ? 'Admin' : 'Super Admin'}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full text-destructive hover:text-destructive hover:bg-destructive/10',
            collapsed ? 'justify-center px-2' : 'justify-start px-3'
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </Button>
      </div>
    </div>
  );

  // Mobile sidebar (rendered as overlay, controlled by AppLayout)
  if (isMobile) {
    return (
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-background border-r shadow-xl md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop sidebar
  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 256 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="hidden md:flex flex-col h-full border-r bg-background shrink-0 relative overflow-hidden"
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 z-10 w-6 h-6 rounded-full border bg-background shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
        aria-label={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
      >
        <ChevronLeft
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200',
            collapsed && 'rotate-180'
          )}
        />
      </button>
      {sidebarContent}
    </motion.aside>
  );
}

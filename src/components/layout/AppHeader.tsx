'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Menu, Search, Bell, Sun, Moon, LogOut, User, KeyRound, PackageX, ShoppingCart, AlertTriangle, CheckCheck, Clock, Info, Truck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavStore, useAuthStore } from '@/store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PageName } from '@/types';

const pageTitles: Record<PageName, string> = {
  dashboard: 'Dashboard',
  pos: 'Kasir (POS)',
  products: 'Produk',
  categories: 'Kategori',
  suppliers: 'Supplier',
  customers: 'Pelanggan',
  transactions: 'Riwayat Transaksi',
  purchases: 'Pembelian',
  stock: 'Manajemen Stok',
  reports: 'Laporan',
  settings: 'Pengaturan',
  'tax-settings': 'Pajak & Service Charge',
  branches: 'Cabang',
  users: 'Pengguna',
};

interface DbNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  data: string | null;
}

const typeIconMap: Record<string, React.ReactNode> = {
  low_stock: <PackageX className="w-4 h-4 text-amber-500" />,
  out_of_stock: <PackageX className="w-4 h-4 text-red-500" />,
  sale_completed: <ShoppingCart className="w-4 h-4 text-emerald-500" />,
  payment_received: <ShoppingCart className="w-4 h-4 text-emerald-500" />,
  new_user: <UserPlus className="w-4 h-4 text-blue-500" />,
  purchase_received: <Truck className="w-4 h-4 text-violet-500" />,
  system: <Info className="w-4 h-4 text-blue-500" />,
};

const typeBgMap: Record<string, string> = {
  low_stock: 'bg-amber-50 dark:bg-amber-950/30',
  out_of_stock: 'bg-red-50 dark:bg-red-950/30',
  sale_completed: 'bg-emerald-50 dark:bg-emerald-950/30',
  payment_received: 'bg-emerald-50 dark:bg-emerald-950/30',
  new_user: 'bg-blue-50 dark:bg-blue-950/30',
  purchase_received: 'bg-violet-50 dark:bg-violet-950/30',
  system: 'bg-blue-50 dark:bg-blue-950/30',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHr < 24) return `${diffHr} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

interface AppHeaderProps {
  onOpenProfile?: () => void;
}

export default function AppHeader({ onOpenProfile }: AppHeaderProps) {
  const { currentPage, toggleSidebar } = useNavStore();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const queryClient = useQueryClient();

  const title = pageTitles[currentPage] || 'Dashboard';

  const { data: notifData } = useQuery<{ data: DbNotification[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications?limit=30').then((r) => r.json()),
    refetchInterval: 15_000, // poll every 15s
    staleTime: 10_000,
  });

  const notifications = notifData?.data ?? [];
  const unreadCount = notifData?.unreadCount ?? 0;

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/read-all', { method: 'PUT' });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const markAsRead = useCallback(async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  // Re-check when popover opens
  useEffect(() => {
    if (notifOpen) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [notifOpen, queryClient]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '??';

  const roleLabel =
    user?.role === 'cashier'
      ? 'Kasir'
      : user?.role === 'admin'
        ? 'Admin'
        : 'Super Admin';

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 sm:gap-3 h-14 sm:h-16 px-3 sm:px-4 lg:px-6 bg-background/80 backdrop-blur-md border-b shrink-0">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Page title - desktop */}
      <h1 className="text-base sm:text-lg font-semibold truncate hidden sm:block">{title}</h1>

      {/* Page title - mobile */}
      <h1 className="text-base sm:text-lg font-semibold truncate sm:hidden flex-1">{title}</h1>

      {/* Search bar - desktop */}
      <div className="hidden md:flex items-center flex-1 max-w-md ml-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari menu, produk, transaksi..."
            className="pl-9 h-9 bg-muted/50 border-0 focus-visible:border-ring focus-visible:ring-1"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>
      </div>

      {/* Mobile search icon */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        aria-label="Cari"
      >
        <Search className="w-5 h-5" />
      </Button>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* Notification bell - REAL */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 sm:h-10 sm:w-10"
              aria-label="Notifikasi"
            >
              <Bell className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[9px] sm:text-[10px] bg-emerald-600 border-0 rounded-full animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[calc(100vw-2rem)] sm:w-96 p-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Notifikasi</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                    {unreadCount} baru
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={markAllRead}
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Tandai semua
                </Button>
              )}
            </div>
            <Separator />

            {/* Notification list */}
            <ScrollArea className="max-h-72 sm:max-h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${
                        notif.isRead ? 'opacity-60' : ''
                      }`}
                      onClick={() => !notif.isRead && markAsRead(notif.id)}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            typeBgMap[notif.type] || 'bg-gray-50 dark:bg-gray-900'
                          }`}
                        >
                          {typeIconMap[notif.type] || <Info className="w-4 h-4 text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium leading-tight ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {notifications.length > 0 && (
              <>
                <Separator />
                <div className="px-4 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs text-muted-foreground"
                    onClick={() => setNotifOpen(false)}
                  >
                    Lihat semua notifikasi
                  </Button>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:h-10 sm:w-10"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle tema"
        >
          <Sun className="w-[18px] h-[18px] sm:w-5 sm:h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute w-[18px] h-[18px] sm:w-5 sm:h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'Pengguna'}</p>
                <p className="text-xs text-muted-foreground leading-none mt-1">
                  {user?.email || ''}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 capitalize">
                  {roleLabel}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenProfile}>
              <User className="mr-2 h-4 w-4" />
              Profil Saya
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenProfile}>
              <KeyRound className="mr-2 h-4 w-4" />
              Ubah Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

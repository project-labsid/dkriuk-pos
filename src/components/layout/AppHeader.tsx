'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Menu, Search, Bell, Sun, Moon, LogOut, User, KeyRound, PackageX, ShoppingCart, AlertTriangle, CheckCheck, Clock } from 'lucide-react';
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
  settings: 'Pengaturan Toko',
  'tax-settings': 'Pajak & Service Charge',
  branches: 'Cabang',
  users: 'Pengguna',
};

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'warning' | 'success' | 'info';
  read: boolean;
  icon: React.ReactNode;
}

const sampleNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Stok Menipis',
    description: 'Kopi Arabica tinggal 5 pcs. Segera restok untuk menghindari kehabisan.',
    time: '5 menit lalu',
    type: 'warning',
    read: false,
    icon: <PackageX className="w-4 h-4 text-amber-500" />,
  },
  {
    id: '2',
    title: 'Transaksi Berhasil',
    description: 'Penjualan #TRX-0842 senilai Rp 450.000 telah berhasil dicatat.',
    time: '15 menit lalu',
    type: 'success',
    read: false,
    icon: <ShoppingCart className="w-4 h-4 text-emerald-500" />,
  },
  {
    id: '3',
    title: 'Peringatan Stok',
    description: '3 produk mendekati batas minimum stok. Periksa halaman stok.',
    time: '1 jam lalu',
    type: 'warning',
    read: false,
    icon: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  },
  {
    id: '4',
    title: 'Laporan Harian',
    description: 'Ringkasan penjualan hari ini: 12 transaksi, total Rp 2.350.000.',
    time: '2 jam lalu',
    type: 'info',
    read: true,
    icon: <Clock className="w-4 h-4 text-blue-500" />,
  },
];

const typeStyles: Record<string, string> = {
  warning: 'bg-amber-50 dark:bg-amber-950/30',
  success: 'bg-emerald-50 dark:bg-emerald-950/30',
  info: 'bg-blue-50 dark:bg-blue-950/30',
};

interface AppHeaderProps {
  onOpenProfile?: () => void;
}

export default function AppHeader({ onOpenProfile }: AppHeaderProps) {
  const { currentPage, toggleSidebar } = useNavStore();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(sampleNotifications);
  const [notifOpen, setNotifOpen] = useState(false);

  const title = pageTitles[currentPage] || 'Dashboard';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '??';

  const roleLabel =
    user?.role === 'cashir'
      ? 'Kasir'
      : user?.role === 'admin'
        ? 'Admin'
        : 'Super Admin';

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

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
        {/* Notification bell */}
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
                <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[9px] sm:text-[10px] bg-emerald-600 border-0 rounded-full">
                  {unreadCount}
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
                        notif.read ? 'opacity-70' : ''
                      }`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            typeStyles[notif.type]
                          }`}
                        >
                          {notif.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium leading-tight ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {notif.time}
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

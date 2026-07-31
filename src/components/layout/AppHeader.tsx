'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Menu, Search, Bell, Sun, Moon, LogOut, User, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface AppHeaderProps {
  onOpenProfile?: () => void;
}

export default function AppHeader({ onOpenProfile }: AppHeaderProps) {
  const { currentPage, toggleSidebar } = useNavStore();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const title = pageTitles[currentPage] || 'Dashboard';
  const notificationCount = 3;

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

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 h-16 px-4 lg:px-6 bg-background/80 backdrop-blur-md border-b shrink-0">
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

      {/* Page title */}
      <h1 className="text-lg font-semibold truncate hidden sm:block">{title}</h1>

      {/* Mobile title */}
      <h1 className="text-lg font-semibold truncate sm:hidden flex-1">{title}</h1>

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
      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi">
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-emerald-600 border-0">
              {notificationCount}
            </Badge>
          )}
        </Button>

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle tema"
        >
          <Sun className="w-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute w-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
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

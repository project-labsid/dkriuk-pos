'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  Bell,
  PackageX,
  PackageOpen,
  ShoppingCart,
  BarChart3,
  UserPlus,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store';

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

interface NotificationPreferences {
  lowStockAlert: boolean;
  outOfStockAlert: boolean;
  saleCompleted: boolean;
  dailyReport: boolean;
  newUserAlert: boolean;
  purchaseAlert: boolean;
  systemAlert: boolean;
}

const defaultPreferences: NotificationPreferences = {
  lowStockAlert: true,
  outOfStockAlert: true,
  saleCompleted: false,
  dailyReport: false,
  newUserAlert: false,
  purchaseAlert: true,
  systemAlert: true,
};

const allKeys = Object.keys(defaultPreferences) as (keyof NotificationPreferences)[];

const notificationToggles: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: 'lowStockAlert',
    label: 'Stok Menipis',
    description: 'Terima notifikasi saat stok produk mendekati batas minimum',
    icon: PackageX,
  },
  {
    key: 'outOfStockAlert',
    label: 'Stok Habis',
    description: 'Terima notifikasi saat stok produk sudah habis',
    icon: PackageOpen,
  },
  {
    key: 'saleCompleted',
    label: 'Transaksi Selesai',
    description: 'Terima notifikasi setiap kali transaksi berhasil diselesaikan',
    icon: ShoppingCart,
  },
  {
    key: 'dailyReport',
    label: 'Laporan Harian',
    description: 'Terima ringkasan laporan penjualan setiap hari',
    icon: BarChart3,
  },
  {
    key: 'newUserAlert',
    label: 'User Baru',
    description: 'Terima notifikasi saat ada user baru yang terdaftar di sistem',
    icon: UserPlus,
  },
  {
    key: 'purchaseAlert',
    label: 'Pembelian Diterima',
    description: 'Terima notifikasi saat pembelian dari supplier berhasil dicatat',
    icon: Truck,
  },
  {
    key: 'systemAlert',
    label: 'Notifikasi Sistem',
    description: 'Terima notifikasi penting dari sistem seperti pembaruan atau error',
    icon: AlertCircle,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationSettings({ onBack }: NotificationSettingsProps) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notification-settings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User belum login');
      const res = await fetch(`/api/notifications/settings?userId=${userId}`);
      if (!res.ok) throw new Error('Gagal memuat pengaturan notifikasi');
      const json = await res.json();
      return json.data as NotificationPreferences;
    },
    enabled: !!userId,
  });

  // Server values (defaults merged with fetched data)
  const serverValues = useMemo<NotificationPreferences>(() => {
    if (!data) return defaultPreferences;
    return { ...defaultPreferences, ...data };
  }, [data]);

  // Track user overrides separately (keys that were toggled)
  const [overrides, setOverrides] = useState<Partial<NotificationPreferences>>({});
  const [savedServerValues, setSavedServerValues] = useState<NotificationPreferences>(serverValues);

  // Final preferences = server values merged with local overrides
  const preferences = useMemo<NotificationPreferences>(() => {
    return { ...savedServerValues, ...overrides };
  }, [savedServerValues, overrides]);

  // Detect unsaved changes
  const hasChanges = useMemo(() => {
    return allKeys.some((key) => overrides[key] !== undefined && overrides[key] !== savedServerValues[key]);
  }, [overrides, savedServerValues]);

  const handleToggle = useCallback((key: keyof NotificationPreferences) => {
    setOverrides((prev) => {
      // Toggle: if currently overridden to true → remove override (revert), else set to flipped
      const currentVal = prev[key] !== undefined ? prev[key] : savedServerValues[key];
      const newVal = !currentVal;
      const next = { ...prev, [key]: newVal };
      return next;
    });
  }, [savedServerValues]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User belum login');
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...preferences }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      return json;
    },
    onSuccess: () => {
      toast.success('Pengaturan notifikasi berhasil disimpan');
      // Merge overrides into saved server values and clear overrides
      const newSaved = { ...savedServerValues, ...overrides };
      queueMicrotask(() => {
        setSavedServerValues(newSaved);
        setOverrides({});
      });
      queryClient.invalidateQueries({ queryKey: ['notification-settings', userId] });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Notifikasi</h1>
          <p className="text-muted-foreground text-sm">
            Atur notifikasi yang ingin Anda terima dari sistem
          </p>
        </div>
      </div>

      {/* Description Card */}
      <Card className="rounded-xl border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Aktifkan atau nonaktifkan notifikasi sesuai kebutuhan Anda. Notifikasi yang dipilih akan dikirim secara real-time saat peristiwa terjadi.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Toggle List */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-emerald-600" />
            Preferensi Notifikasi
          </CardTitle>
          <CardDescription>
            Pilih jenis notifikasi yang ingin Anda terima
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {notificationToggles.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0 mt-0.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences[item.key]}
                        onCheckedChange={() => handleToggle(item.key)}
                        className="shrink-0 ml-3"
                      />
                    </div>
                    {index < notificationToggles.length - 1 && (
                      <Separator />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Separator className="my-3" />

          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasChanges}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

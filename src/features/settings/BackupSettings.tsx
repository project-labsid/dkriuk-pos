'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Database, Download, Upload, Loader2, AlertTriangle, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbStats {
  totalProducts: number;
  totalTransactions: number;
  totalCustomers: number;
  totalPurchases: number;
  totalCategories: number;
  totalSuppliers: number;
  totalBranches: number;
  totalUsers: number;
  totalStockAdjustments: number;
  dbSize: string;
}

interface BackupTables {
  branches: unknown[];
  categories: unknown[];
  suppliers: unknown[];
  customers: unknown[];
  users: unknown[];
  products: unknown[];
  taxSettings: unknown[];
  serviceChargeSettings: unknown[];
  storeSettings: unknown[];
  transactions: unknown[];
  purchases: unknown[];
  stockAdjustments: unknown[];
}

interface BackupPayload {
  data: {
    exportedAt: string;
    version: string;
    tables: BackupTables;
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function BackupSettings() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const [pendingFileName, setPendingFileName] = useState('');

  // ── Fetch DB Stats ──
  const { data: stats, isLoading: statsLoading } = useQuery<DbStats>({
    queryKey: ['backup-stats'],
    queryFn: async () => {
      const res = await fetch('/api/backup?stats=true');
      if (!res.ok) throw new Error('Gagal memuat statistik database');
      const json = await res.json();
      return json.data as DbStats;
    },
  });

  // ── Export Handler ──
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal mengekspor data');
      }
      const json = await res.json();

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data berhasil diekspor');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Import Handler (file select) ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        // Basic validation before opening dialog
        if (!parsed?.data?.tables) {
          toast.error('Format file backup tidak valid');
          return;
        }
        setPendingBackup(parsed as BackupPayload);
        setConfirmOpen(true);
      } catch {
        toast.error('File tidak dapat dibaca sebagai JSON');
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  // ── Import Handler (confirm) ──
  const handleImportConfirm = async () => {
    if (!pendingBackup) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingBackup),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengimpor data');
      }

      toast.success(json.data.message || 'Data berhasil diimpor');
      queryClient.invalidateQueries();
      setConfirmOpen(false);
      setPendingBackup(null);

      // Suggest page reload after import
      setTimeout(() => {
        toast('Data telah diperbarui. Disarankan untuk memuat ulang halaman.', {
          action: {
            label: 'Muat Ulang',
            onClick: () => window.location.reload(),
          },
          duration: 10000,
        });
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  // ── Compute table counts for confirmation dialog ──
  const tableLabels: { key: keyof BackupTables; label: string }[] = [
    { key: 'branches', label: 'Cabang' },
    { key: 'categories', label: 'Kategori' },
    { key: 'suppliers', label: 'Supplier' },
    { key: 'customers', label: 'Pelanggan' },
    { key: 'users', label: 'Pengguna' },
    { key: 'products', label: 'Produk' },
    { key: 'taxSettings', label: 'Pengaturan Pajak' },
    { key: 'serviceChargeSettings', label: 'Pengaturan Biaya Layanan' },
    { key: 'storeSettings', label: 'Pengaturan Toko' },
    { key: 'transactions', label: 'Transaksi' },
    { key: 'purchases', label: 'Pembelian' },
    { key: 'stockAdjustments', label: 'Penyesuaian Stok' },
  ];

  const nonEmptyTables = pendingBackup
    ? tableLabels.filter((t) => (pendingBackup.data.tables[t.key] as unknown[]).length > 0)
    : [];

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* ── DB Stats Section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Statistik Database
          </CardTitle>
          <CardDescription>
            Ringkasan data yang tersimpan saat ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <StatItem label="Produk" value={stats.totalProducts} />
              <StatItem label="Transaksi" value={stats.totalTransactions} />
              <StatItem label="Pelanggan" value={stats.totalCustomers} />
              <StatItem label="Pembelian" value={stats.totalPurchases} />
              <StatItem label="Kategori" value={stats.totalCategories} />
              <StatItem label="Supplier" value={stats.totalSuppliers} />
              <StatItem label="Cabang" value={stats.totalBranches} />
              <StatItem label="Pengguna" value={stats.totalUsers} />
              <StatItem label="Penyesuaian Stok" value={stats.totalStockAdjustments} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Export Section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Ekspor Data
          </CardTitle>
          <CardDescription>
            Unduh seluruh data dalam format JSON sebagai cadangan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            File backup berisi seluruh data termasuk produk, transaksi, pelanggan, dan pengaturan toko.
            Password pengguna tidak disertakan untuk keamanan.
          </p>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Ekspor Data
          </Button>
        </CardContent>
      </Card>

      {/* ── Import Section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Impor Data
          </CardTitle>
          <CardDescription>
            Pulihkan data dari file backup JSON
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 mb-4">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Perhatian</p>
                <p className="mt-1">
                  Mengimpor data akan <strong>mengganti seluruh data yang ada</strong> di database.
                  Pastikan Anda sudah melakukan ekspor terlebih dahulu sebagai cadangan.
                  Password semua pengguna akan diatur ulang setelah impor.
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Impor Data
          </Button>
        </CardContent>
      </Card>

      {/* ── Confirmation Dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={(open) => {
        if (!open) setPendingBackup(null);
        setConfirmOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Konfirmasi Impor Data
            </DialogTitle>
            <DialogDescription>
              Anda akan mengimpor data dari file <strong>{pendingFileName}</strong>.
              Seluruh data saat ini akan dihapus dan diganti dengan data dari file ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Isi file backup:
              </p>
              <div className="flex flex-wrap gap-2">
                {nonEmptyTables.map((t) => (
                  <Badge key={t.key} variant="secondary">
                    {t.label}:{' '}
                    {(pendingBackup!.data.tables[t.key] as unknown[]).length}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground">
              Ekspor: {pendingBackup?.data.exportedAt ? new Date(pendingBackup.data.exportedAt).toLocaleString('id-ID') : '-'}
              {' · '}Versi: {pendingBackup?.data.version || '-'}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setPendingBackup(null);
              }}
              disabled={isImporting}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleImportConfirm} disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Ya, Impor Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value.toLocaleString('id-ID')}</p>
    </div>
  );
}

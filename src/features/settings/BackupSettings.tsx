'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  Upload,
  Database,
  HardDrive,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  Package,
  ShoppingCart,
  Users,
  Tags,
  Truck,
  UserCircle,
  FileJson,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BackupSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

interface BackupStats {
  users: number;
  branches: number;
  categories: number;
  suppliers: number;
  customers: number;
  products: number;
  transactions: number;
  purchases: number;
  stockAdjustments: number;
}

const statCards = [
  { key: 'products' as const, label: 'Produk', icon: Package, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { key: 'transactions' as const, label: 'Transaksi', icon: ShoppingCart, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400' },
  { key: 'customers' as const, label: 'Pelanggan', icon: UserCircle, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/40 dark:text-violet-400' },
  { key: 'categories' as const, label: 'Kategori', icon: Tags, color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/40 dark:text-pink-400' },
  { key: 'suppliers' as const, label: 'Supplier', icon: Truck, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400' },
  { key: 'users' as const, label: 'Pengguna', icon: Users, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-400' },
  { key: 'purchases' as const, label: 'Pembelian', icon: HardDrive, color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/40 dark:text-teal-400' },
  { key: 'stockAdjustments' as const, label: 'Stok Adj.', icon: Database, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function BackupSettings({ onBack }: BackupSettingsProps) {
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModule, setImportModule] = useState<string>('all');
  const [importStrategy, setImportStrategy] = useState<string>('merge');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ─── Fetch backup stats ──────────────────────────────────────────────────
  const { data: backupData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['backup-stats'],
    queryFn: async () => {
      const res = await fetch('/api/settings/backup');
      if (!res.ok) throw new Error('Gagal memuat statistik');
      const json = await res.json();
      return json as {
        version: string;
        exportedAt: string;
        appVersion: string;
        stats: BackupStats;
        data: Record<string, unknown[]>;
      };
    },
  });

  const totalRecords = backupData
    ? Object.values(backupData.stats).reduce((a, b) => a + b, 0)
    : 0;

  // ─── Export mutation ─────────────────────────────────────────────────────
  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/backup');
      if (!res.ok) throw new Error('Gagal mengekspor data');
      return res.json();
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `dkriuk-pos-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup berhasil diunduh!');
    },
    onError: () => toast.error('Gagal mengekspor data'),
  });

  // ─── Import mutation ─────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Pilih file backup terlebih dahulu');
      const text = await selectedFile.text();
      const parsed = JSON.parse(text);

      const modules = importModule === 'all' ? [] : [importModule];
      const options = {
        replaceAll: importStrategy === 'replace',
        importedOnly: true,
        modules,
      };

      const res = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed.data, options }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengimpor data');
      return json;
    },
    onSuccess: (data) => {
      toast.success(`${data.message}`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Reset mutation ─────────────────────────────────────────────────────
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preserveUserId: user?.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mereset');
      return json;
    },
    onSuccess: () => {
      toast.success('Semua data berhasil direset. Silakan refresh halaman.');
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast.error('Format file harus .json');
        return;
      }
      setSelectedFile(file);
    }
  };

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backup & Restore</h1>
          <p className="text-muted-foreground text-sm">
            Ekspor, impor, dan kelola data aplikasi Anda
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="rounded-xl border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Cadangkan data secara berkala
              </p>
              <p className="text-xs text-muted-foreground">
                Ekspor data ke file JSON untuk disimpan secara lokal. Gunakan fitur impor untuk memulihkan data dari backup sebelumnya.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-emerald-600" />
              Statistik Database
            </span>
            {backupData && (
              <Badge variant="secondary" className="font-normal">
                {totalRecords.toLocaleString('id-ID')} total record
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Ringkasan data yang tersimpan dalam sistem</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                const value = backupData?.stats[stat.key] ?? 0;
                return (
                  <div
                    key={stat.key}
                    className="rounded-lg border p-3 space-y-2 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{value.toLocaleString('id-ID')}</p>
                      <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {backupData && (
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Terakhir diakses: {new Date(backupData.exportedAt).toLocaleString('id-ID')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export & Import */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-emerald-600" />
              Ekspor Data
            </CardTitle>
            <CardDescription>
              Unduh semua data ke file backup JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <FileJson className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>File backup berisi seluruh data:</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li>Produk, kategori, supplier</li>
                  <li>Pelanggan & pengguna</li>
                  <li>Transaksi & pembelian</li>
                  <li>Pengaturan toko</li>
                </ul>
              </div>
            </div>
            <Button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Unduh Backup
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-emerald-600" />
              Impor Data
            </CardTitle>
            <CardDescription>
              Pulihkan data dari file backup JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {selectedFile ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Pilih File Backup</p>
                      <p className="text-xs text-muted-foreground">
                        Format .json
                      </p>
                    </div>
                  </>
                )}
              </button>
            </div>

            {/* Module Selection */}
            <div className="space-y-2">
              <Label className="text-sm">Modul yang Diimpor</Label>
              <Select value={importModule} onValueChange={setImportModule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Data</SelectItem>
                  <SelectItem value="products">Produk</SelectItem>
                  <SelectItem value="categories">Kategori</SelectItem>
                  <SelectItem value="suppliers">Supplier</SelectItem>
                  <SelectItem value="customers">Pelanggan</SelectItem>
                  <SelectItem value="settings">Pengaturan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Strategy Selection */}
            <div className="space-y-2">
              <Label className="text-sm">Strategi Impor</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportStrategy('merge')}
                  className={`rounded-lg border-2 px-3 py-2.5 text-xs font-medium transition-all cursor-pointer text-center ${
                    importStrategy === 'merge'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  Tambah Baru
                  <p className="font-normal mt-0.5 opacity-70">Data lama tetap ada</p>
                </button>
                <button
                  type="button"
                  onClick={() => setImportStrategy('replace')}
                  className={`rounded-lg border-2 px-3 py-2.5 text-xs font-medium transition-all cursor-pointer text-center ${
                    importStrategy === 'replace'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  Ganti Semua
                  <p className="font-normal mt-0.5 opacity-70">Data lama dihapus</p>
                </button>
              </div>
            </div>

            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending || !selectedFile}
              variant="outline"
              className="w-full gap-2"
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Impor Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="rounded-xl border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Zona Berbahaya
          </CardTitle>
          <CardDescription>
            Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah melakukan backup sebelum melanjutkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
            <div className="space-y-1">
              <p className="text-sm font-medium">Reset Semua Data</p>
              <p className="text-xs text-muted-foreground">
                Hapus semua data kecuali akun Anda. Semua produk, transaksi, pelanggan, dan pengaturan akan dihapus permanen.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2 shrink-0">
                  <Trash2 className="h-4 w-4" />
                  Reset Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan menghapus <strong>semua data</strong> dari sistem (produk, transaksi, pelanggan, supplier, kategori, pengaturan, dll).{' '}
                    Akun Anda akan disimpan dengan role Super Admin.
                    <br /><br />
                    Tindakan ini <strong>tidak dapat dibatalkan</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetMutation.mutate()}
                    disabled={resetMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {resetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Ya, Reset Semua Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

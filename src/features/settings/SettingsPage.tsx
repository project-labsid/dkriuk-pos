'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Store,
  Users,
  Printer,
  Bell,
  Palette,
  Cloud,
  HelpCircle,
  ChevronRight,
  Percent,
  CreditCard,
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore, useSettingsStore } from '@/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
// Lazy-load sub-pages
const AccountSettings = dynamic(() => import('./AccountSettings'), { ssr: false });
const StoreInfoSettings = dynamic(() => import('./StoreInfoSettings'), { ssr: false });
const NotificationSettings = dynamic(() => import('./NotificationSettings'), { ssr: false });
const AppearanceSettings = dynamic(() => import('./AppearanceSettings'), { ssr: false });
const UsersPage = dynamic(() => import('@/features/users/UsersPage'), { ssr: false });
const PrinterSettings = dynamic(() => import('./PrinterSettings'), { ssr: false });
const BackupSettings = dynamic(() => import('./BackupSettings'), { ssr: false });
const PaymentMethodSettings = dynamic(() => import('./PaymentMethodSettings'), { ssr: false });
const HelpSettings = dynamic(() => import('./HelpSettings'), { ssr: false });
// --- Types ---
type SettingsSubPage =
  | null
  | 'account'
  | 'store-info'
  | 'users'
  | 'printer'
  | 'payment-methods'
  | 'notifications'
  | 'appearance'
  | 'backup'
  | 'help'
  | 'tax'
  | 'reset-data';
interface MenuItem {
  id: SettingsSubPage;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  external?: boolean;
}
// --- Menu Items ---
const menuItems: MenuItem[] = [
  {
    id: 'account',
    icon: <User className="w-5 h-5" />,
    label: 'Akun',
    description: 'Kelola profil dan keamanan',
  },
  {
    id: 'store-info',
    icon: <Store className="w-5 h-5" />,
    label: 'Informasi Toko',
    description: 'Logo, alamat, kontak',
  },
  {
    id: 'users',
    icon: <Users className="w-5 h-5" />,
    label: 'Pengguna',
    description: 'Role dan hak akses',
  },
  {
    id: 'printer',
    icon: <Printer className="w-5 h-5" />,
    label: 'Printer',
    description: 'Cetak struk & konfigurasi',
  },
  {
    id: 'payment-methods',
    icon: <CreditCard className="w-5 h-5" />,
    label: 'Metode Pembayaran',
    description: 'Tunai, debit, e-wallet, QRIS',
  },
  {
    id: 'notifications',
    icon: <Bell className="w-5 h-5" />,
    label: 'Notifikasi',
    description: 'Atur pemberitahuan',
  },
  {
    id: 'appearance',
    icon: <Palette className="w-5 h-5" />,
    label: 'Tampilan',
    description: 'Tema & bahasa',
  },
  {
    id: 'backup',
    icon: <Cloud className="w-5 h-5" />,
    label: 'Backup & Restore',
    description: 'Ekspor & impor data',
  },
  {
    id: 'help',
    icon: <HelpCircle className="w-5 h-5" />,
    label: 'Bantuan',
    description: 'FAQ & dukungan',
  },
  {
    id: 'tax',
    icon: <Percent className="w-5 h-5" />,
    label: 'Pajak & Service Charge',
    description: 'Konfigurasi pajak dan biaya layanan',
  },
  {
    id: 'reset-data',
    icon: <Trash2 className="w-5 h-5" />,
    label: 'Reset Data',
    description: 'Hapus semua data toko',
    badgeVariant: 'destructive',
  },
];
// --- Animation ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};
const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};
// --- Main Settings Page ---
export default function SettingsPage() {
  const [subPage, setSubPage] = useState<SettingsSubPage>(null);
  const { user } = useAuthStore();
  const role = user?.role;
  const goBack = () => setSubPage(null);
  const visibleItems = menuItems.filter((item) => {
    if (item.id === 'users' && role !== 'super_admin') return false;
    if (item.id === 'reset-data' && role !== 'super_admin') return false;
    return true;
  });
  return (
    <AnimatePresence mode="wait">
      {subPage === null ? (
        <motion.div
          key="menu"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, y: -8 }}
          className="p-4 sm:p-6 space-y-6"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Pengaturan</h2>
            <p className="text-sm text-muted-foreground mt-1">Kelola preferensi dan konfigurasi aplikasi</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {visibleItems.map((item) => (
              <motion.div key={item.id} variants={itemVariants}>
                <Card
                  className={cn(
                    'group cursor-pointer hover:shadow-md transition-all duration-200',
                    item.id === 'reset-data'
                      ? 'hover:border-red-200 dark:hover:border-red-800'
                      : 'hover:border-emerald-200 dark:hover:border-emerald-800'
                  )}
                  onClick={() => setSubPage(item.id)}
                >
                  <div className="p-4 sm:p-5 flex items-center gap-4">
                    <div
                      className={cn(
                        'shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors',
                        item.id === 'reset-data'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-950/70'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/70'
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-medium text-sm sm:text-base',
                          item.id === 'reset-data' && 'text-red-600 dark:text-red-400'
                        )}>{item.label}</span>
                        {item.badge && (
                          <Badge variant={item.badgeVariant || 'outline'} className="text-[10px] px-1.5 py-0 h-4">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    </div>
                    <ChevronRight className="shrink-0 w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={subPage}
          {...fadeIn}
          exit={{ opacity: 0, x: 20 }}
          className="p-4 sm:p-6"
        >
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Pengaturan
          </button>
          {subPage === 'account' && <AccountSettings onBack={goBack} />}
          {subPage === 'store-info' && <StoreInfoSettings onBack={goBack} />}
          {subPage === 'notifications' && <NotificationSettings onBack={goBack} />}
          {subPage === 'appearance' && <AppearanceSettings onBack={goBack} />}
          {subPage === 'users' && <UsersPage />}
          {subPage === 'printer' && <PrinterSettings onBack={goBack} />}
          {subPage === 'payment-methods' && <PaymentMethodSettings onBack={goBack} />}
          {subPage === 'backup' && <BackupSettings onBack={goBack} />}
          {subPage === 'help' && <HelpSettings onBack={goBack} />}
          {subPage === 'tax' && <TaxSettingsInline onBack={goBack} />}
          {subPage === 'reset-data' && <ResetDataSection onBack={goBack} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
// --- Tax Settings (inline, simplified) ---
function TaxSettingsInline({ onBack }: { onBack: () => void }) {
  const { taxConfig, setTaxConfig, serviceChargeConfig, setServiceChargeConfig } = useSettingsStore();
  const queryClient = useQueryClient();
  const [taxEnabled, setTaxEnabled] = useState(taxConfig.isEnabled);
  const [taxPercent, setTaxPercent] = useState(String(taxConfig.percentage));
  const [taxMode, setTaxMode] = useState(taxConfig.mode);
  const [scEnabled, setScEnabled] = useState(serviceChargeConfig.isEnabled);
  const [scPercent, setScPercent] = useState(String(serviceChargeConfig.percentage));
  const saveMutation = useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan');
      return res.json();
    },
    onSuccess: () => {
      setTaxConfig({
        isEnabled: taxEnabled,
        percentage: parseFloat(taxPercent),
        mode: taxMode as 'include' | 'exclude',
        applyToAll: true,
      });
      setServiceChargeConfig({
        isEnabled: scEnabled,
        percentage: parseFloat(scPercent),
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Pengaturan pajak berhasil disimpan');
    },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });
  const handleSave = () => {
    saveMutation.mutate({
      tax_enabled: String(taxEnabled),
      tax_percentage: taxPercent,
      tax_mode: taxMode,
      service_charge_enabled: String(scEnabled),
      service_charge_percentage: scPercent,
    });
  };
  return (
    <motion.div {...fadeIn} className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Pajak & Service Charge</h2>
        <p className="text-sm text-muted-foreground mt-1">Konfigurasi pajak dan biaya layanan</p>
      </div>
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Pajak (PPN)</h3>
            <p className="text-xs text-muted-foreground">Aktifkan pajak untuk transaksi</p>
          </div>
          <div
            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
              taxEnabled ? 'bg-emerald-600' : 'bg-muted'
            }`}
            onClick={() => setTaxEnabled(!taxEnabled)}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                taxEnabled ? 'translate-x-5' : ''
              }`}
            />
          </div>
        </div>
        {taxEnabled && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Persentase Pajak (%)</Label>
                <Input
                  type="number"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Mode Pajak</Label>
                <div className="flex gap-2">
                  {['exclude', 'include'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTaxMode(mode as 'include' | 'exclude')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        taxMode === mode
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      {mode === 'exclude' ? 'Eksternal' : 'Internal'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {taxMode === 'exclude' ? 'Pajak ditambahkan di atas harga' : 'Pajak sudah termasuk dalam harga'}
                </p>
              </div>
            </div>
          </>
        )}
      </Card>
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Service Charge</h3>
            <p className="text-xs text-muted-foreground">Biaya layanan tambahan</p>
          </div>
          <div
            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
              scEnabled ? 'bg-emerald-600' : 'bg-muted'
            }`}
            onClick={() => setScEnabled(!scEnabled)}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                scEnabled ? 'translate-x-5' : ''
              }`}
            />
          </div>
        </div>
        {scEnabled && (
          <div className="space-y-2">
            <Label className="text-sm">Persentase Service Charge (%)</Label>
            <Input
              type="number"
              value={scPercent}
              onChange={(e) => setScPercent(e.target.value)}
              min={0}
              max={100}
              className="max-w-xs"
            />
          </div>
        )}
      </Card>
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Simpan
        </Button>
      </div>
    </motion.div>
  );
}
// --- Reset Data Section ---
function ResetDataSection({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reset', {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Gagal mereset data');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Semua data berhasil direset');
      setConfirmText('');
      setDialogOpen(false);
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const handleReset = () => {
    if (confirmText !== 'RESET') return;
    resetMutation.mutate();
  };
  return (
    <motion.div {...fadeIn} className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Reset Data</h2>
        <p className="text-sm text-muted-foreground mt-1">Hapus semua data toko dan mulai dari awal</p>
      </div>
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold">Reset Semua Data</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Hapus semua data termasuk produk, transaksi, pelanggan, dan pengaturan. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setDialogOpen(true)}
            className="shrink-0 gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Reset Semua Data
          </Button>
        </div>
      </Card>
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4 sm:p-6">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Peringatan</p>
            <p className="mt-1">
              Reset akan menghapus <strong>semua data</strong> dari sistem termasuk produk, kategori, transaksi, pelanggan, dan pengaturan toko. Akun admin akan tetap tersimpan.
            </p>
          </div>
        </div>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              Konfirmasi Reset Data
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus <strong>SEMUA</strong> data dari sistem. Akun Anda akan tetap tersimpan sebagai Super Admin, tetapi semua data lainnya akan hilang secara permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-confirm" className="text-sm">
                Ketik <span className="font-mono font-bold text-destructive">RESET</span> untuk mengkonfirmasi:
              </Label>
              <Input
                id="reset-confirm"
                placeholder="Ketik RESET di sini"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setConfirmText(''); }} disabled={resetMutation.isPending}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'RESET' || resetMutation.isPending}
              onClick={handleReset}
            >
              {resetMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Ya, Reset Semua Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

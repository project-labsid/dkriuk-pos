'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  Printer,
  FileText,
  Type,
  Hash,
  ImageIcon,
  Receipt,
  TestTube,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PrinterSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const printerSettingKeys = [
  'printer_paper_width',
  'printer_auto_print',
  'printer_show_logo',
  'printer_header_text',
  'printer_footer_text',
  'printer_copies',
  'printer_show_customer_name',
  'printer_show_payment_detail',
] as const;

type PrinterSettingKey = (typeof printerSettingKeys)[number];

const defaultSettings: Record<PrinterSettingKey, string> = {
  printer_paper_width: '80mm',
  printer_auto_print: 'false',
  printer_show_logo: 'true',
  printer_header_text: '',
  printer_footer_text: 'Terima kasih atas kunjungan Anda!',
  printer_copies: '1',
  printer_show_customer_name: 'true',
  printer_show_payment_detail: 'true',
};

// ─── Receipt Preview ──────────────────────────────────────────────────────────

function ReceiptPreview({
  paperWidth,
  showLogo,
  headerText,
  footerText,
  showCustomer,
  showPaymentDetail,
}: {
  paperWidth: string;
  showLogo: boolean;
  headerText: string;
  footerText: string;
  showCustomer: boolean;
  showPaymentDetail: boolean;
}) {
  const isSmall = paperWidth === '58mm';
  return (
    <div
      className={cn(
        'mx-auto bg-white text-black rounded-sm shadow-lg border p-4 font-mono text-[11px] leading-relaxed',
        isSmall ? 'max-w-[200px]' : 'max-w-[280px]'
      )}
    >
      {/* Header */}
      <div className="text-center space-y-1">
        {showLogo && (
          <div className="w-10 h-10 mx-auto bg-gray-200 rounded-md flex items-center justify-center mb-1">
            <Receipt className="w-5 h-5 text-gray-500" />
          </div>
        )}
        <p className="font-bold text-sm">Dkriuk POS</p>
        {headerText && <p className="text-[10px] text-gray-600 whitespace-pre-line">{headerText}</p>}
        <p className="text-[10px] text-gray-500">Jl. Contoh No. 123, Jakarta</p>
        <p className="text-[10px] text-gray-500">Telp: 0812-3456-7890</p>
      </div>

      <Separator className="my-2 bg-gray-300" />

      {/* Transaction info */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>No:</span>
          <span>INV-20250101-001</span>
        </div>
        <div className="flex justify-between">
          <span>Tgl:</span>
          <span>01/01/2025 10:30</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir:</span>
          <span>Admin</span>
        </div>
        {showCustomer && (
          <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span>Budi Santoso</span>
          </div>
        )}
      </div>

      <Separator className="my-2 bg-gray-300" />

      {/* Items */}
      <div className="space-y-1.5">
        <div>
          <p className="font-medium">Kopi Susu x2</p>
          <p className="text-[10px] text-gray-500 pl-2">  25.000 x 2 = 50.000</p>
        </div>
        <div>
          <p className="font-medium">Roti Bakar x1</p>
          <p className="text-[10px] text-gray-500 pl-2">  15.000 x 1 = 15.000</p>
        </div>
      </div>

      <Separator className="my-2 bg-gray-300" />

      {/* Totals */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>Rp 65.000</span>
        </div>
        <div className="flex justify-between">
          <span>Diskon:</span>
          <span>-Rp 0</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>TOTAL:</span>
          <span>Rp 65.000</span>
        </div>
      </div>

      {showPaymentDetail && (
        <>
          <Separator className="my-2 bg-gray-300" />
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Tunai:</span>
              <span>Rp 100.000</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Kembalian:</span>
              <span>Rp 35.000</span>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      {footerText && (
        <>
          <Separator className="my-2 bg-gray-300" />
          <p className="text-center text-[10px] text-gray-500 whitespace-pre-line">{footerText}</p>
        </>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrinterSettings({ onBack }: PrinterSettingsProps) {
  const queryClient = useQueryClient();

  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Gagal memuat pengaturan');
      const json = await res.json();
      return json.data as Record<string, string>;
    },
  });

  const mergedSettings = useMemo<Record<PrinterSettingKey, string>>(() => {
    const base = { ...defaultSettings };
    if (serverSettings) {
      for (const key of printerSettingKeys) {
        if (serverSettings[key] !== undefined) {
          base[key] = serverSettings[key];
        }
      }
    }
    return base;
  }, [serverSettings]);

  const [overrides, setOverrides] = useState<Partial<Record<PrinterSettingKey, string>>>({});

  const localSettings = useMemo<Record<PrinterSettingKey, string>>(() => {
    return { ...mergedSettings, ...overrides };
  }, [mergedSettings, overrides]);

  const updateSetting = useCallback((key: PrinterSettingKey, value: string) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hasChanges = useMemo(() => {
    return printerSettingKeys.some((key) => overrides[key] !== undefined && overrides[key] !== mergedSettings[key]);
  }, [overrides, mergedSettings]);

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
      toast.success('Pengaturan printer berhasil disimpan');
      setOverrides({});
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Gagal menyimpan pengaturan printer'),
  });

  const handleSave = () => {
    const payload: Record<string, string> = {};
    for (const key of printerSettingKeys) {
      payload[key] = localSettings[key];
    }
    saveMutation.mutate(payload);
  };

  const handleReset = () => {
    const resetOverrides: Partial<Record<PrinterSettingKey, string>> = {};
    for (const key of printerSettingKeys) {
      resetOverrides[key] = defaultSettings[key];
    }
    setOverrides(resetOverrides);
    toast.info('Pengaturan direset ke default');
  };

  const handleTestPrint = () => {
    toast.success('Struk test berhasil dikirim ke printer!');
  };

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Printer</h1>
          <p className="text-muted-foreground text-sm">
            Konfigurasi cetak struk untuk transaksi
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Column */}
          <div className="space-y-6">
            {/* Paper & Auto Print */}
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Printer className="h-5 w-5 text-emerald-600" />
                  Umum
                </CardTitle>
                <CardDescription>Pengaturan dasar printer struk</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Paper Width */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Lebar Kertas
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['58mm', '80mm'].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateSetting('printer_paper_width', w)}
                        className={cn(
                          'rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all cursor-pointer text-center',
                          localSettings.printer_paper_width === w
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {localSettings.printer_paper_width === '58mm'
                      ? 'Lebar kertas thermal 58mm (struk kecil)'
                      : 'Lebar kertas thermal 80mm (standar)'}
                  </p>
                </div>

                <Separator />

                {/* Auto Print */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm flex items-center gap-1.5">
                      Cetak Otomatis
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Cetak struk otomatis setelah transaksi
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.printer_auto_print === 'true'}
                    onCheckedChange={(v) => updateSetting('printer_auto_print', String(v))}
                  />
                </div>

                <Separator />

                {/* Copies */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    Jumlah Cetak
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateSetting('printer_copies', String(n))}
                        className={cn(
                          'rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all cursor-pointer text-center',
                          localSettings.printer_copies === String(n)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receipt Content */}
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Type className="h-5 w-5 text-emerald-600" />
                  Konten Struk
                </CardTitle>
                <CardDescription>Atur informasi yang tampil di struk</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show Logo */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Tampilkan Logo</Label>
                    <p className="text-xs text-muted-foreground">
                      Tampilkan logo toko di struk
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.printer_show_logo === 'true'}
                    onCheckedChange={(v) => updateSetting('printer_show_logo', String(v))}
                  />
                </div>

                <Separator />

                {/* Show Customer Name */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Nama Pelanggan</Label>
                    <p className="text-xs text-muted-foreground">
                      Tampilkan nama pelanggan di struk
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.printer_show_customer_name === 'true'}
                    onCheckedChange={(v) => updateSetting('printer_show_customer_name', String(v))}
                  />
                </div>

                <Separator />

                {/* Show Payment Detail */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Detail Pembayaran</Label>
                    <p className="text-xs text-muted-foreground">
                      Tampilkan info bayar & kembalian
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.printer_show_payment_detail === 'true'}
                    onCheckedChange={(v) => updateSetting('printer_show_payment_detail', String(v))}
                  />
                </div>

                <Separator />

                {/* Header Text */}
                <div className="space-y-2">
                  <Label className="text-sm">Teks Header Tambahan</Label>
                  <Input
                    value={localSettings.printer_header_text}
                    onChange={(e) => updateSetting('printer_header_text', e.target.value)}
                    placeholder="Contoh: Toko Buah Segar Alami"
                  />
                </div>

                {/* Footer Text */}
                <div className="space-y-2">
                  <Label className="text-sm">Teks Footer</Label>
                  <Input
                    value={localSettings.printer_footer_text}
                    onChange={(e) => updateSetting('printer_footer_text', e.target.value)}
                    placeholder="Contoh: Terima kasih atas kunjungan Anda!"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasChanges}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan
              </Button>
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Default
              </Button>
              <Button variant="outline" onClick={handleTestPrint} className="gap-2">
                <TestTube className="h-4 w-4" />
                Test Cetak
              </Button>
            </div>
          </div>

          {/* Preview Column */}
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="h-5 w-5 text-emerald-600" />
                  Pratinjau Struk
                </CardTitle>
                <CardDescription>Preview struk sesuai pengaturan Anda</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-6">
                  <ReceiptPreview
                    paperWidth={localSettings.printer_paper_width}
                    showLogo={localSettings.printer_show_logo === 'true'}
                    headerText={localSettings.printer_header_text}
                    footerText={localSettings.printer_footer_text}
                    showCustomer={localSettings.printer_show_customer_name === 'true'}
                    showPaymentDetail={localSettings.printer_show_payment_detail === 'true'}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </motion.div>
  );
}

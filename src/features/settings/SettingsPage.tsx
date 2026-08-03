'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StoreInfoSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const timezoneOptions = [
  { label: 'Asia/Jakarta (WIB)', value: 'Asia/Jakarta' },
  { label: 'Asia/Makassar (WITA)', value: 'Asia/Makassar' },
  { label: 'Asia/Jayapura (WIT)', value: 'Asia/Jayapura' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const storeInfoSchema = z.object({
  store_name: z.string().min(1, 'Nama toko wajib diisi'),
  store_address: z.string().default(''),
  store_phone: z.string().default(''),
  store_email: z.string().email('Email tidak valid').or(z.literal('')).default(''),
  store_npwp: z.string().default(''),
  store_receipt_footer: z.string().default(''),
  store_timezone: z.string().default('Asia/Jakarta'),
});

type StoreInfoForm = z.infer<typeof storeInfoSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function StoreInfoSettings({ onBack }: StoreInfoSettingsProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Gagal memuat pengaturan');
      const json = await res.json();
      return json.data as Record<string, string>;
    },
  });

  const form = useForm<StoreInfoForm>({
    resolver: zodResolver(storeInfoSchema),
    defaultValues: {
      store_name: '',
      store_address: '',
      store_phone: '',
      store_email: '',
      store_npwp: '',
      store_receipt_footer: '',
      store_timezone: 'Asia/Jakarta',
    },
    values: data
      ? {
          store_name: data.store_name || '',
          store_address: data.store_address || '',
          store_phone: data.store_phone || '',
          store_email: data.store_email || '',
          store_npwp: data.store_npwp || '',
          store_receipt_footer: data.store_receipt_footer || '',
          store_timezone: data.store_timezone || 'Asia/Jakarta',
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (values: StoreInfoForm) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      return json;
    },
    onSuccess: () => {
      toast.success('Pengaturan toko berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: StoreInfoForm) => mutation.mutate(values);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Informasi Toko</h1>
          <p className="text-muted-foreground text-sm">
            Kelola informasi dasar toko Anda
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5 text-emerald-600" />
            Detail Informasi Toko
          </CardTitle>
          <CardDescription>
            Informasi ini akan ditampilkan pada struk dan laporan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Nama Toko */}
                <FormField
                  control={form.control}
                  name="store_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Toko</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama toko" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alamat */}
                <FormField
                  control={form.control}
                  name="store_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan alamat lengkap toko" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telepon & Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="store_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telepon</FormLabel>
                        <FormControl>
                          <Input placeholder="08xxxxxxxxxx" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="store_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@toko.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* NPWP */}
                <FormField
                  control={form.control}
                  name="store_npwp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID (NPWP)</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000.0-000.000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Receipt Footer */}
                <FormField
                  control={form.control}
                  name="store_receipt_footer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Footer Struk</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Terima kasih atas kunjungan Anda..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Zona Waktu */}
                <FormField
                  control={form.control}
                  name="store_timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona Waktu</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih zona waktu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timezoneOptions.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Submit */}
                <Button type="submit" disabled={mutation.isPending} className="gap-2">
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Pengaturan Toko
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

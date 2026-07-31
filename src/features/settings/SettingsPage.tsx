'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, Store, Percent, Receipt, Save, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

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

// ─── Section: Informasi Toko ─────────────────────────────────────────────────

const storeInfoSchema = z.object({
  store_name: z.string().min(1, 'Nama toko wajib diisi'),
  store_address: z.string().default(''),
  store_phone: z.string().default(''),
  store_email: z.string().email('Email tidak valid').or(z.literal('')).default(''),
  store_currency: z.string().default('Rp'),
  store_timezone: z.string().default('Asia/Jakarta'),
});

type StoreInfoForm = z.infer<typeof storeInfoSchema>;

function StoreInfoSection() {
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
      store_currency: 'Rp',
      store_timezone: 'Asia/Jakarta',
    },
    values: data
      ? {
          store_name: data.store_name || '',
          store_address: data.store_address || '',
          store_phone: data.store_phone || '',
          store_email: data.store_email || '',
          store_currency: data.store_currency || 'Rp',
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
    <motion.div {...fadeIn}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Informasi Toko
          </CardTitle>
          <CardDescription>
            Kelola informasi dasar toko Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="store_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan alamat toko" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="store_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mata Uang</FormLabel>
                        <FormControl>
                          <Input placeholder="Rp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                </div>
                <Separator />
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
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

// ─── Section: Pajak ───────────────────────────────────────────────────────────

const taxSchema = z.object({
  isEnabled: z.boolean(),
  percentage: z.coerce.number().min(0).max(100),
  mode: z.enum(['include', 'exclude']),
  applyToAll: z.boolean(),
});

type TaxForm = z.infer<typeof taxSchema>;

function TaxSection() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings-tax'],
    queryFn: async () => {
      const res = await fetch('/api/settings/tax');
      if (!res.ok) throw new Error('Gagal memuat pengaturan pajak');
      const json = await res.json();
      return json.data;
    },
  });

  const form = useForm<TaxForm>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      isEnabled: false,
      percentage: 11,
      mode: 'exclude',
      applyToAll: true,
    },
    values: data
      ? {
          isEnabled: data.isEnabled ?? false,
          percentage: data.percentage ?? 11,
          mode: data.mode ?? 'exclude',
          applyToAll: data.applyToAll ?? true,
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (values: TaxForm) => {
      const res = await fetch('/api/settings/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      return json;
    },
    onSuccess: () => {
      toast.success('Pengaturan pajak berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['settings-tax'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: TaxForm) => mutation.mutate(values);

  const watchEnabled = form.watch('isEnabled');

  return (
    <motion.div {...fadeIn}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Pengaturan Pajak
          </CardTitle>
          <CardDescription>
            Konfigurasi pajak untuk transaksi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Pajak Aktif</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Aktifkan perhitungan pajak pada transaksi
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className={watchEnabled ? '' : 'pointer-events-none opacity-50'}>
                  <FormField
                    control={form.control}
                    name="percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persentase Pajak (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            placeholder="11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="mode"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Mode Pajak</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col gap-3 sm:flex-row"
                            >
                              <Label
                                htmlFor="exclude"
                                className={[
                                  'flex flex-1 cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors',
                                  field.value === 'exclude'
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:bg-muted',
                                ].join(' ')}
                              >
                                <RadioGroupItem value="exclude" id="exclude" />
                                <div>
                                  <p className="font-medium">Exclude Tax</p>
                                  <p className="text-xs text-muted-foreground">
                                    Pajak ditambahkan di atas harga
                                  </p>
                                </div>
                              </Label>
                              <Label
                                htmlFor="include"
                                className={[
                                  'flex flex-1 cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors',
                                  field.value === 'include'
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:bg-muted',
                                ].join(' ')}
                              >
                                <RadioGroupItem value="include" id="include" />
                                <div>
                                  <p className="font-medium">Include Tax</p>
                                  <p className="text-xs text-muted-foreground">
                                    Harga sudah termasuk pajak
                                  </p>
                                </div>
                              </Label>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="applyToAll"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Terapkan ke Semua Produk</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Otomatis terapkan pajak ke semua produk
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Simpan Pengaturan Pajak
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Section: Service Charge ──────────────────────────────────────────────────

const serviceChargeSchema = z.object({
  isEnabled: z.boolean(),
  percentage: z.coerce.number().min(0).max(100),
});

type ServiceChargeForm = z.infer<typeof serviceChargeSchema>;

function ServiceChargeSection() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings-service-charge'],
    queryFn: async () => {
      const res = await fetch('/api/settings/service-charge');
      if (!res.ok) throw new Error('Gagal memuat pengaturan service charge');
      const json = await res.json();
      return json.data;
    },
  });

  const form = useForm<ServiceChargeForm>({
    resolver: zodResolver(serviceChargeSchema),
    defaultValues: {
      isEnabled: false,
      percentage: 5,
    },
    values: data
      ? {
          isEnabled: data.isEnabled ?? false,
          percentage: data.percentage ?? 5,
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (values: ServiceChargeForm) => {
      const res = await fetch('/api/settings/service-charge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      return json;
    },
    onSuccess: () => {
      toast.success('Pengaturan service charge berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['settings-service-charge'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: ServiceChargeForm) => mutation.mutate(values);

  const watchEnabled = form.watch('isEnabled');

  return (
    <motion.div {...fadeIn}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Pengaturan Service Charge
          </CardTitle>
          <CardDescription>
            Konfigurasi biaya layanan untuk transaksi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Service Charge Aktif</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Aktifkan biaya layanan pada transaksi
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className={watchEnabled ? '' : 'pointer-events-none opacity-50'}>
                  <FormField
                    control={form.control}
                    name="percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persentase Service Charge (%)</FormLabel>
                        <div className="flex gap-2">
                          <FormControl className="flex-1">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              placeholder="5"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <div className="mt-2 flex gap-2">
                          {[5, 10, 15].map((pct) => (
                            <Button
                              key={pct}
                              type="button"
                              size="sm"
                              variant={field.value === pct ? 'default' : 'outline'}
                              onClick={() => form.setValue('percentage', pct)}
                            >
                              {pct}%
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Simpan Pengaturan Service Charge
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Pengaturan
        </h1>
        <p className="text-muted-foreground">
          Kelola pengaturan toko, pajak, dan service charge
        </p>
      </div>

      <div className="space-y-6">
        <StoreInfoSection />
        <TaxSection />
        <ServiceChargeSection />
      </div>
    </div>
  );
}

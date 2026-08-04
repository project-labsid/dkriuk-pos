'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Printer, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

// ─── Schema & Types ───────────────────────────────────────────────────────────

const printerSettingsSchema = z.object({
  printer_paper_width: z.string().default('80'),
  printer_auto_print: z.boolean().default(false),
  printer_copies: z.coerce.number().min(1, 'Minimal 1 salinan').max(10, 'Maksimal 10 salinan').default(1),
  printer_header_text: z.string().default(''),
  printer_footer_text: z.string().default(''),
  printer_show_logo: z.boolean().default(true),
});

type PrinterSettingsForm = z.infer<typeof printerSettingsSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PrinterSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings-printer'],
    queryFn: async () => {
      const res = await fetch('/api/settings/printer');
      if (!res.ok) throw new Error('Gagal memuat pengaturan printer');
      const json = await res.json();
      return json.data as Record<string, string>;
    },
  });

  const form = useForm<PrinterSettingsForm>({
    resolver: zodResolver(printerSettingsSchema),
    defaultValues: {
      printer_paper_width: '80',
      printer_auto_print: false,
      printer_copies: 1,
      printer_header_text: '',
      printer_footer_text: '',
      printer_show_logo: true,
    },
    values: data
      ? {
          printer_paper_width: data.printer_paper_width || '80',
          printer_auto_print: data.printer_auto_print === 'true',
          printer_copies: Number(data.printer_copies) || 1,
          printer_header_text: data.printer_header_text || '',
          printer_footer_text: data.printer_footer_text || '',
          printer_show_logo: data.printer_show_logo !== 'false',
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (values: PrinterSettingsForm) => {
      // Convert boolean fields back to string for storage
      const payload: Record<string, string> = {
        printer_paper_width: values.printer_paper_width,
        printer_auto_print: String(values.printer_auto_print),
        printer_copies: String(values.printer_copies),
        printer_header_text: values.printer_header_text,
        printer_footer_text: values.printer_footer_text,
        printer_show_logo: String(values.printer_show_logo),
      };

      const res = await fetch('/api/settings/printer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan pengaturan printer');
      return json;
    },
    onSuccess: () => {
      toast.success('Pengaturan printer berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['settings-printer'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: PrinterSettingsForm) => mutation.mutate(values);

  return (
    <motion.div {...fadeIn}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Pengaturan Printer
          </CardTitle>
          <CardDescription>
            Konfigurasi cetak struk dan thermal printer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Lebar Kertas */}
                <FormField
                  control={form.control}
                  name="printer_paper_width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lebar Kertas</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih lebar kertas" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="58">58mm</SelectItem>
                          <SelectItem value="80">80mm</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Auto Cetak */}
                <FormField
                  control={form.control}
                  name="printer_auto_print"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Auto Cetak</FormLabel>
                        <FormDescription>
                          Otomatis cetak struk setelah transaksi berhasil
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Jumlah Salinan */}
                <FormField
                  control={form.control}
                  name="printer_copies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Salinan</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Teks Header Struk */}
                <FormField
                  control={form.control}
                  name="printer_header_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Header Struk</FormLabel>
                      <FormDescription>
                        Tambahan teks di atas struk, misal: &ldquo;Toko Buah Segar&rdquo;
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Masukkan teks header struk"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Teks Footer Struk */}
                <FormField
                  control={form.control}
                  name="printer_footer_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Footer Struk</FormLabel>
                      <FormDescription>
                        Tambahan teks di bawah struk, misal: &ldquo;Barang yang sudah dibeli tidak dapat dikembalikan&rdquo;
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Masukkan teks footer struk"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tampilkan Logo */}
                <FormField
                  control={form.control}
                  name="printer_show_logo"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Tampilkan Logo</FormLabel>
                        <FormDescription>
                          Tampilkan logo toko pada struk
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Save Button */}
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Simpan Pengaturan Printer
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

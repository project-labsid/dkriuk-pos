'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Brain, Save, Loader2, Eye, EyeOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const AI_FEATURES = [
  {
    key: 'smart_suggestion',
    label: 'Saran Produk',
    description: 'Rekomendasi produk berdasarkan riwayat transaksi',
  },
  {
    key: 'sales_analysis',
    label: 'Analisis Penjualan',
    description: 'Ringkasan dan analisis penjualan otomatis',
  },
  {
    key: 'stock_prediction',
    label: 'Prediksi Stok',
    description: 'Peringatan stok berdasarkan tren penjualan',
  },
  {
    key: 'auto_categorize',
    label: 'Kategorisasi Otomatis',
    description: 'Klasifikasi produk ke kategori yang tepat',
  },
  {
    key: 'customer_insight',
    label: 'Insight Pelanggan',
    description: 'Analisis pola belanja pelanggan',
  },
] as const;

type AIFeature = (typeof AI_FEATURES)[number]['key'];

// ─── Schema & Types ───────────────────────────────────────────────────────────

const aiSettingsSchema = z.object({
  ai_api_key: z.string().default(''),
  ai_model: z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']).default('gpt-4o-mini'),
  smart_suggestion: z.boolean().default(false),
  sales_analysis: z.boolean().default(false),
  stock_prediction: z.boolean().default(false),
  auto_categorize: z.boolean().default(false),
  customer_insight: z.boolean().default(false),
});

type AISettingsForm = z.infer<typeof aiSettingsSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AIAssistantSettings() {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['settings-ai'],
    queryFn: async () => {
      const res = await fetch('/api/settings/ai');
      if (!res.ok) throw new Error('Gagal memuat pengaturan AI');
      const json = await res.json();
      return json.data as Record<string, string>;
    },
  });

  const form = useForm<AISettingsForm>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      ai_api_key: '',
      ai_model: 'gpt-4o-mini',
      smart_suggestion: false,
      sales_analysis: false,
      stock_prediction: false,
      auto_categorize: false,
      customer_insight: false,
    },
    values: data
      ? {
          ai_api_key: '',
          ai_model: (data.ai_model as AISettingsForm['ai_model']) || 'gpt-4o-mini',
          smart_suggestion: parseFeatures(data.ai_enabled_features).includes('smart_suggestion'),
          sales_analysis: parseFeatures(data.ai_enabled_features).includes('sales_analysis'),
          stock_prediction: parseFeatures(data.ai_enabled_features).includes('stock_prediction'),
          auto_categorize: parseFeatures(data.ai_enabled_features).includes('auto_categorize'),
          customer_insight: parseFeatures(data.ai_enabled_features).includes('customer_insight'),
        }
      : undefined,
  });

  // Track whether the user has a stored API key
  const hasApiKey = !!data?.ai_api_key && data.ai_api_key.length > 0;

  const mutation = useMutation({
    mutationFn: async (values: AISettingsForm) => {
      const enabledFeatures: string[] = [];
      for (const feature of AI_FEATURES) {
        if (values[feature.key]) {
          enabledFeatures.push(feature.key);
        }
      }

      const payload: Record<string, string> = {
        ai_model: values.ai_model,
        ai_enabled_features: JSON.stringify(enabledFeatures),
      };

      // Only send API key if the user typed something new
      if (apiKeyInput.length > 0) {
        payload.ai_api_key = apiKeyInput;
      }

      const res = await fetch('/api/settings/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan pengaturan AI');
      return json;
    },
    onSuccess: () => {
      toast.success('Pengaturan AI berhasil disimpan');
      setApiKeyInput('');
      queryClient.invalidateQueries({ queryKey: ['settings-ai'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Koneksi gagal');
      return json;
    },
    onSuccess: () => toast.success('Koneksi API berhasil!'),
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: AISettingsForm) => mutation.mutate(values);

  return (
    <motion.div {...fadeIn}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Asisten AI
          </CardTitle>
          <CardDescription>
            Konfigurasi asisten AI untuk fitur cerdas di POS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* API Key */}
                <FormField
                  control={form.control}
                  name="ai_api_key"
                  render={() => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showApiKey ? 'text' : 'password'}
                            placeholder={hasApiKey ? 'Kunci tersimpan — biarkan kosong untuk tetap' : 'sk-...'}
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {hasApiKey
                          ? 'API key tersimpan. Ketik key baru untuk mengganti.'
                          : 'Masukkan OpenAI API key Anda.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Model AI */}
                <FormField
                  control={form.control}
                  name="ai_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model AI</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih model AI" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast &amp; Cheap)</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Feature Toggles */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Fitur AI</Label>
                  {AI_FEATURES.map((feature) => (
                    <FormField
                      key={feature.key}
                      control={form.control}
                      name={feature.key}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">{feature.label}</FormLabel>
                            <FormDescription>{feature.description}</FormDescription>
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
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Simpan Pengaturan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={testMutation.isPending}
                    onClick={() => testMutation.mutate()}
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Test Koneksi
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function parseFeatures(jsonString: string | undefined): AIFeature[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.filter((f: string) =>
        (AI_FEATURES.map((feat) => feat.key) as readonly string[]).includes(f)
      ) as AIFeature[];
    }
    return [];
  } catch {
    return [];
  }
}

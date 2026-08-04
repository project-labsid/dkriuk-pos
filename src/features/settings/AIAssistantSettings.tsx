'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Sparkles,
  MessageSquare,
  BarChart3,
  Lightbulb,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Save,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AIAssistantSettingsProps {
  onBack: () => void;
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

export default function AIAssistantSettings({ onBack: _onBack }: AIAssistantSettingsProps) {
  const queryClient = useQueryClient();

  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [salesForecast, setSalesForecast] = useState(false);
  const [restockAlert, setRestockAlert] = useState(true);
  const [customerInsight, setCustomerInsight] = useState(false);
  const [aiModel, setAiModel] = useState('gpt-4o-mini');

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
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Pengaturan AI berhasil disimpan');
    },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });

  const handleSave = () => {
    saveMutation.mutate({
      ai_smart_suggestions: String(smartSuggestions),
      ai_auto_categorize: String(autoCategorize),
      ai_sales_forecast: String(salesForecast),
      ai_restock_alert: String(restockAlert),
      ai_customer_insight: String(customerInsight),
      ai_model: aiModel,
    });
  };

  const features = [
    { icon: Sparkles, label: 'Saran Produk Cerdas', desc: 'Rekomendasi produk berdasarkan riwayat penjualan', state: smartSuggestions, toggle: setSmartSuggestions },
    { icon: MessageSquare, label: 'Kategorisasi Otomatis', desc: 'AI mengelompokkan produk ke kategori yang tepat', state: autoCategorize, toggle: setAutoCategorize },
    { icon: BarChart3, label: 'Prediksi Penjualan', desc: 'Perkiraan tren penjualan ke depan', state: salesForecast, toggle: setSalesForecast },
    { icon: Lightbulb, label: 'Peringatan Restock Cerdas', desc: 'Saran waktu restock berdasarkan pola penjualan', state: restockAlert, toggle: setRestockAlert },
    { icon: Bot, label: 'Insight Pelanggan', desc: 'Analisis perilaku dan preferensi pelanggan', state: customerInsight, toggle: setCustomerInsight },
  ];

  return (
    <motion.div {...fadeIn} className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">🤖 AI Assistant</h2>
        <p className="text-sm text-muted-foreground mt-1">Konfigurasi fitur kecerdasan buatan</p>
      </div>

      {/* Model Selection */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="font-semibold">Model AI</h3>
          <p className="text-xs text-muted-foreground">Pilih model yang digunakan untuk fitur AI</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Cepat & hemat' },
            { id: 'gpt-4o', label: 'GPT-4o', desc: 'Seimbang' },
            { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', desc: 'Akurasi tinggi' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setAiModel(m.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                aiModel === m.id
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Feature Toggles */}
      <Card className="p-4 sm:p-6 space-y-1">
        <div className="mb-3">
          <h3 className="font-semibold">Fitur AI</h3>
          <p className="text-xs text-muted-foreground">Aktifkan atau nonaktifkan fitur AI</p>
        </div>
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                </div>
              </div>
              <button onClick={() => f.toggle(!f.state)} className="shrink-0">
                {f.state
                  ? <ToggleRight className="w-10 h-10 text-emerald-600" />
                  : <ToggleLeft className="w-10 h-10 text-muted-foreground/50" />}
              </button>
            </div>
          );
        })}
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Simpan
        </Button>
      </div>
    </motion.div>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gem,
  Check,
  Crown,
  Zap,
  Building2,
  CalendarDays,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SubscriptionSettingsProps {
  onBack: () => void;
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

const plans = [
  {
    id: 'free',
    name: 'Gratis',
    price: 'Rp 0',
    period: '/bulan',
    icon: Zap,
    color: 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400',
    features: [
      'Maks. 100 produk',
      '1 pengguna',
      'Laporan dasar',
      '1 cabang',
    ],
    current: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'Rp 99.000',
    period: '/bulan',
    icon: Gem,
    popular: true,
    color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    features: [
      'Produk tak terbatas',
      'Hingga 5 pengguna',
      'Laporan lengkap',
      'Hingga 3 cabang',
      'Notifikasi stok cerdas',
      'AI Assistant',
      'Backup otomatis',
    ],
    current: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Rp 249.000',
    period: '/bulan',
    icon: Crown,
    color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    features: [
      'Semua fitur Pro',
      'Pengguna tak terbatas',
      'Cabang tak terbatas',
      'API akses penuh',
      'AI Assistant premium',
      'Prioritas support',
      'Kustomisasi laporan',
      'Integrasi API pihak ketiga',
    ],
    current: false,
  },
];

export default function SubscriptionSettings({ onBack: _onBack }: SubscriptionSettingsProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">💎 Langganan</h2>
        <p className="text-sm text-muted-foreground mt-1">Kelola paket dan pembayaran</p>
      </div>

      {/* Current Plan Info */}
      <Card className="p-4 sm:p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Paket Gratis</p>
              <p className="text-xs text-muted-foreground">Berlaku hingga 31 Desember 2025</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">12 hari tersisa</span>
          </div>
        </div>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.current;
          const isSelected = selectedPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all ${
                isCurrent
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800'
              } ${plan.popular ? 'md:-mt-2 md:mb-[-8px]' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  POPULER
                </div>
              )}
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${plan.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <div className="space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className={`w-full ${
                    isCurrent
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                  disabled={isCurrent}
                  onClick={() => !isCurrent && setSelectedPlan(plan.id)}
                >
                  {isCurrent ? 'Paket Saat Ini' : (
                    <>
                      Pilih Paket
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Billing History */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Riwayat Pembayaran</h3>
          <CreditCard className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada riwayat pembayaran</p>
          <p className="text-xs mt-1">Riwayat akan muncul setelah upgrade paket</p>
        </div>
      </Card>
    </motion.div>
  );
}

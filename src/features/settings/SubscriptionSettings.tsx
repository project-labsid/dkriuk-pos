'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gem, Check, Crown, Zap, CalendarDays, CreditCard, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

const plans = [
  { id:'free', name:'Gratis', price:'Rp 0', period:'/bulan', icon:Zap, color:'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400', features:['Maks. 100 produk','1 pengguna','Laporan dasar','1 cabang'], current:true },
  { id:'pro', name:'Pro', price:'Rp 99.000', period:'/bulan', icon:Gem, popular:true, color:'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400', features:['Produk tak terbatas','Hingga 5 pengguna','Laporan lengkap','Hingga 3 cabang','Notifikasi stok cerdas','AI Assistant','Backup otomatis'], current:false },
  { id:'enterprise', name:'Enterprise', price:'Rp 249.000', period:'/bulan', icon:Crown, color:'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400', features:['Semua fitur Pro','Pengguna tak terbatas','Cabang tak terbatas','API akses penuh','AI premium','Prioritas support','Kustomisasi laporan'], current:false },
];

export default function SubscriptionSettings({ onBack: _onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div><h2 className="text-xl font-bold">Langganan</h2><p className="text-sm text-muted-foreground mt-1">Kelola paket dan pembayaran</p></div>
      <Card className="p-4 sm:p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><Zap className="w-5 h-5"/></div><div><p className="font-semibold">Paket Gratis</p><p className="text-xs text-muted-foreground">Berlaku hingga 31 Desember 2025</p></div></div>
          <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-muted-foreground"/><span className="text-sm text-muted-foreground">Aktif</span></div>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(p => { const Icon=p.icon; return (
          <Card key={p.id} className={`relative overflow-hidden transition-all ${p.current?'border-emerald-500 ring-2 ring-emerald-500/20':selected===p.id?'border-emerald-500 ring-2 ring-emerald-500/20':'hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800'} ${p.popular?'md:-mt-2':''}`}>
            {p.popular && <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">POPULER</div>}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center`}><Icon className="w-5 h-5"/></div><h3 className="font-semibold">{p.name}</h3></div>
              <div><span className="text-2xl font-bold">{p.price}</span><span className="text-sm text-muted-foreground">{p.period}</span></div>
              <div className="space-y-2">{p.features.map(f=><div key={f} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0"/><span>{f}</span></div>)}</div>
              <Button className={`w-full ${p.current?'bg-muted text-muted-foreground':'bg-emerald-600 hover:bg-emerald-700'}`} disabled={p.current} onClick={()=>!p.current&&setSelected(p.id)}>{p.current?'Paket Saat Ini':<>Pilih Paket<ArrowRight className="w-4 h-4 ml-1"/></>}</Button>
            </div>
          </Card>
        ); })}
      </div>
      <Card className="p-4 sm:p-6"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Riwayat Pembayaran</h3><CreditCard className="w-4 h-4 text-muted-foreground"/></div><div className="text-center py-8 text-muted-foreground"><p className="text-sm">Belum ada riwayat pembayaran</p><p className="text-xs mt-1">Riwayat akan muncul setelah upgrade paket</p></div></Card>
    </motion.div>
  );
}
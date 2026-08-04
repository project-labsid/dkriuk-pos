'use client';
import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };
const keys = ['printer_paper_width','printer_auto_print','printer_show_logo','printer_header_text','printer_footer_text','printer_copies','printer_show_customer_name','printer_show_payment_detail'] as const;
type K = (typeof keys)[number];
const defaults: Record<K,string> = { printer_paper_width:'80mm', printer_auto_print:'false', printer_show_logo:'true', printer_header_text:'', printer_footer_text:'Terima kasih atas kunjungan Anda!', printer_copies:'1', printer_show_customer_name:'true', printer_show_payment_detail:'true' };
export default function PrinterSettings({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const { data: srv, isLoading } = useQuery({ queryKey:['settings'], queryFn: async()=>{ const r=await fetch('/api/settings'); if(!r.ok) throw new Error(); return (await r.json()).data as Record<string,string>; } });
  const merged = useMemo<Record<K,string>>(()=>{ const b={...defaults}; if(srv) for(const k of keys) if(srv[k]!==undefined) b[k]=srv[k]; return b; },[srv]);
  const [ov,setOv]=useState<Partial<Record<K,string>>>({});
  const local=useMemo<Record<K,string>>(()=>({...merged,...ov}),[merged,ov]);
  const up=useCallback((k:K,v:string)=>setOv(p=>({...p,[k]:v})),[]);
  const changed=useMemo(()=>keys.some(k=>ov[k]!==undefined&&ov[k]!==merged[k]),[ov,merged]);
  const saveMut=useMutation({ mutationFn:async(s:Record<string,string>)=>{ const r=await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:s})}); if(!r.ok) throw new Error(); }, onSuccess:()=>{ toast.success('Pengaturan printer disimpan'); setOv({}); qc.invalidateQueries({queryKey:['settings']}); }, onError:()=>toast.error('Gagal menyimpan') });
  const save=()=>{ const p:Record<string,string>={}; for(const k of keys) p[k]=local[k]; saveMut.mutate(p); };
  const reset=()=>{ const r:Partial<Record<K,string>>={}; for(const k of keys) r[k]=defaults[k]; setOv(r); toast.info('Reset ke default'); };
  return (
    <motion.div {...fadeIn} className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4"><Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5"/></Button><div><h2 className="text-xl font-bold">Pengaturan Printer</h2><p className="text-sm text-muted-foreground">Konfigurasi cetak struk untuk transaksi</p></div></div>
      {isLoading ? <div className="space-y-4">{[1,2,3].map(i=><Skeleton key={i} className="h-40 w-full rounded-xl"/>)}</div> : (<>
        <Card><CardHeader><CardTitle className="text-lg">Umum</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="space-y-2"><Label>Lebar Kertas</Label><div className="grid grid-cols-2 gap-3">{['58mm','80mm'].map(w=>(<button key={w} type="button" onClick={()=>up('printer_paper_width',w)} className={cn('rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',local.printer_paper_width===w?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-border hover:bg-muted')}>{w}</button>))}</div></div>
          <Separator/><div className="flex items-center justify-between"><div><Label>Cetak Otomatis</Label><p className="text-xs text-muted-foreground">Cetak struk otomatis setelah transaksi</p></div><Switch checked={local.printer_auto_print==='true'} onCheckedChange={v=>up('printer_auto_print',String(v))}/></div>
          <Separator/><div className="space-y-2"><Label>Jumlah Cetak</Label><div className="grid grid-cols-3 gap-3">{[1,2,3].map(n=>(<button key={n} type="button" onClick={()=>up('printer_copies',String(n))} className={cn('rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',local.printer_copies===String(n)?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-border hover:bg-muted')}>{n}x</button>))}</div></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Konten Struk</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="flex items-center justify-between"><div><Label>Tampilkan Logo</Label></div><Switch checked={local.printer_show_logo==='true'} onCheckedChange={v=>up('printer_show_logo',String(v))}/></div>
          <Separator/><div className="flex items-center justify-between"><div><Label>Nama Pelanggan</Label></div><Switch checked={local.printer_show_customer_name==='true'} onCheckedChange={v=>up('printer_show_customer_name',String(v))}/></div>
          <Separator/><div className="flex items-center justify-between"><div><Label>Detail Pembayaran</Label></div><Switch checked={local.printer_show_payment_detail==='true'} onCheckedChange={v=>up('printer_show_payment_detail',String(v))}/></div>
          <Separator/><div className="space-y-2"><Label>Teks Header</Label><Input value={local.printer_header_text} onChange={e=>up('printer_header_text',e.target.value)} placeholder="Header tambahan"/></div>
          <div className="space-y-2"><Label>Teks Footer</Label><Input value={local.printer_footer_text} onChange={e=>up('printer_footer_text',e.target.value)} placeholder="Terima kasih!"/></div>
        </CardContent></Card>
        <div className="flex items-center gap-3"><Button onClick={save} disabled={saveMut.isPending||!changed} className="bg-emerald-600 hover:bg-emerald-700">{saveMut.isPending?<Loader2 className="w-4 h-4 mr-2 animate-spin"/>:<Save className="w-4 h-4 mr-2"/>}Simpan</Button><Button variant="outline" onClick={reset}><RotateCcw className="w-4 h-4 mr-2"/>Reset</Button></div>
      </>)}
    </motion.div>
  );
}

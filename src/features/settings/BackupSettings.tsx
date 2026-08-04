'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Download, Upload, Database, HardDrive, AlertTriangle, Loader2, CheckCircle2, Clock, Package, ShoppingCart, Users, Tags, Truck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/store';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

interface Stats { users: number; branches: number; categories: number; suppliers: number; customers: number; products: number; transactions: number; purchases: number; stockAdjustments: number; }

const statCards = [
  { key: 'products' as const, label: 'Produk', icon: Package, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400' },
  { key: 'transactions' as const, label: 'Transaksi', icon: ShoppingCart, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400' },
  { key: 'customers' as const, label: 'Pelanggan', icon: Users, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/40 dark:text-violet-400' },
  { key: 'categories' as const, label: 'Kategori', icon: Tags, color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/40 dark:text-pink-400' },
  { key: 'suppliers' as const, label: 'Supplier', icon: Truck, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400' },
  { key: 'purchases' as const, label: 'Pembelian', icon: HardDrive, color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/40 dark:text-teal-400' },
  { key: 'stockAdjustments' as const, label: 'Stok Adj.', icon: Database, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400' },
  { key: 'users' as const, label: 'Pengguna', icon: Users, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-400' },
];

export default function BackupSettings({ onBack }: { onBack: () => void }) {
  const user = useAuthStore(s => s.user);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const { data: bd, isLoading } = useQuery({
    queryKey: ['backup-stats'],
    queryFn: async () => { const r = await fetch('/api/settings/backup'); if (!r.ok) throw new Error(); return (await r.json()) as { stats: Stats; exportedAt: string }; },
  });

  const total = bd ? Object.values(bd.stats).reduce((a, b) => a + b, 0) : 0;

  const exportMut = useMutation({
    mutationFn: async () => { const r = await fetch('/api/settings/backup'); if (!r.ok) throw new Error(); return r.json(); },
    onSuccess: (d) => {
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `dkriuk-backup-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success('Backup berhasil diunduh!');
    },
    onError: () => toast.error('Gagal mengekspor'),
  });

  const importMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pilih file');
      const text = await file.text(); const data = JSON.parse(text);
      const r = await fetch('/api/settings/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: data.data, options: { replaceAll: false, importedOnly: true, modules: [] } }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Gagal'); return j;
    },
    onSuccess: (d) => { toast.success(d.message); setFile(null); if (fileRef.current) fileRef.current.value = ''; },
    onError: (e) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: async () => { const r = await fetch('/api/reset', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preserveUserId: user?.id }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; },
    onSuccess: () => { toast.success('Data direset. Refresh halaman.'); setTimeout(() => window.location.reload(), 1500); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div className="flex items-center gap-4"><Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5"/></Button><div><h2 className="text-xl font-bold">Backup & Restore</h2><p className="text-sm text-muted-foreground">Ekspor, impor, dan kelola data aplikasi</p></div></div>

      <Card><CardHeader><CardTitle className="flex items-center justify-between text-lg"><span className="flex items-center gap-2"><HardDrive className="h-5 w-5 text-emerald-600"/>Statistik Database</span>{bd && <Badge variant="secondary">{total.toLocaleString('id-ID')} record</Badge>}</CardTitle></CardHeader><CardContent>
        {isLoading ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-20 rounded-lg"/>)}</div> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{statCards.map(s => { const Icon=s.icon; const v=bd?.stats[s.key]??0; return (
            <div key={s.key} className="rounded-lg border p-3 space-y-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><Icon className="h-4 w-4"/></div><p className="text-lg font-bold">{v.toLocaleString('id-ID')}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
          ); })}</div>
        )}
        {bd && <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5"/><span>Terakhir: {new Date(bd.exportedAt).toLocaleString('id-ID')}</span></div>}
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Download className="h-5 w-5 text-emerald-600"/>Ekspor Data</CardTitle></CardHeader><CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Unduh semua data (produk, transaksi, pelanggan, pengaturan) ke file JSON.</p>
          <Button onClick={() => exportMut.mutate()} disabled={exportMut.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700">{exportMut.isPending ? <Loader2 className="h-4 h-4 animate-spin"/> : <Download className="h-4 h-4"/>} Unduh Backup</Button>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Upload className="h-5 w-5 text-emerald-600"/>Impor Data</CardTitle></CardHeader><CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept=".json" onChange={e=>{const f=e.target.files?.[0]; if(f){if(!f.name.endsWith('.json')){toast.error('Format harus .json');return;}setFile(f);}}} className="hidden"/>
          <button type="button" onClick={()=>fileRef.current?.click()} className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 hover:bg-muted/50 transition-colors cursor-pointer">
            {file ? <><CheckCircle2 className="h-8 w-8 text-emerald-600"/><div className="text-left"><p className="text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size/1024).toFixed(1)} KB</p></div></> : <><Upload className="h-8 w-8 text-muted-foreground"/><div className="text-left"><p className="text-sm font-medium">Pilih File Backup</p><p className="text-xs text-muted-foreground">Format .json</p></div></>}
          </button>
          <Button onClick={()=>importMut.mutate()} disabled={importMut.isPending||!file} variant="outline" className="w-full">{importMut.isPending?<Loader2 className="h-4 h-4 animate-spin"/>:<Upload className="h-4 h-4"/>} Impor Data</Button>
        </CardContent></Card>
      </div>

      <Card className="border-red-200 dark:border-red-900"><CardHeader><CardTitle className="flex items-center gap-2 text-lg text-red-600"><AlertTriangle className="h-5 w-5"/>Zona Berbahaya</CardTitle></CardHeader><CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
          <div><p className="text-sm font-medium">Reset Semua Data</p><p className="text-xs text-muted-foreground">Hapus semua data kecuali akun Anda.</p></div>
          <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="h-4 h-4 mr-2"/>Reset</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle><AlertDialogDescription>Semua data akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={()=>resetMut.mutate()} disabled={resetMut.isPending} className="bg-red-600 hover:bg-red-700">{resetMut.isPending&&<Loader2 className="h-4 h-4 mr-2 animate-spin"/>}Ya, Reset</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
      </CardContent></Card>
    </motion.div>
  );
}
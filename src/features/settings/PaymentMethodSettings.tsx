'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

interface PaymentMethod { id: string; name: string; type: 'cash' | 'qris' | 'transfer' | 'ewallet' | 'credit' | 'other'; isActive: boolean; isDefault: boolean; }

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: '1', name: 'Tunai', type: 'cash', isActive: true, isDefault: true },
  { id: '2', name: 'QRIS', type: 'qris', isActive: true, isDefault: false },
  { id: '3', name: 'Transfer Bank', type: 'transfer', isActive: true, isDefault: false },
  { id: '4', name: 'E-Wallet (GoPay/OVO/Dana)', type: 'ewallet', isActive: true, isDefault: false },
];

const typeLabels: Record<PaymentMethod['type'], string> = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', ewallet: 'E-Wallet', credit: 'Kredit', other: 'Lainnya' };
const typeColors: Record<PaymentMethod['type'], string> = { cash: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', qris: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', ewallet: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', credit: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' };

export default function PaymentMethodSettings() {
  const [methods, setMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<PaymentMethod['type']>('cash');

  const handleAdd = () => {
    if (!newName.trim()) { toast.error('Nama metode pembayaran wajib diisi'); return; }
    setMethods((prev) => [...prev, { id: Date.now().toString(), name: newName.trim(), type: newType, isActive: true, isDefault: false }]);
    setNewName(''); setNewType('cash'); setDialogOpen(false);
    toast.success('Metode pembayaran berhasil ditambahkan');
  };

  const handleToggle = (id: string) => setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m)));
  const handleSetDefault = (id: string) => { setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id }))); toast.success('Metode default berhasil diubah'); };
  const handleDelete = (id: string) => { const m = methods.find((x) => x.id === id); if (m?.isDefault) { toast.error('Tidak bisa menghapus metode default'); return; } setMethods((prev) => prev.filter((x) => x.id !== id)); toast.success('Metode pembayaran berhasil dihapus'); };
  const handleSave = () => toast.success('Pengaturan metode pembayaran berhasil disimpan');

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Metode Pembayaran</CardTitle>
          <CardDescription>Kelola metode pembayaran yang tersedia di kasir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {methods.map((method) => (
              <div key={method.id} className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${!method.isActive ? 'opacity-50' : 'hover:bg-muted/50'}`}>
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{method.name}</span>
                    <Badge variant="secondary" className={typeColors[method.type]}>{typeLabels[method.type]}</Badge>
                    {method.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(method.id)} className={`text-xs ${method.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>{method.isActive ? 'Aktif' : 'Nonaktif'}</Button>
                  {!method.isDefault && <Button variant="ghost" size="sm" onClick={() => handleSetDefault(method.id)} className="text-xs">Jadikan Default</Button>}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(method.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="mr-1.5 h-4 w-4" />Tambah Metode</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Tambah Metode Pembayaran</DialogTitle><DialogDescription>Masukkan nama dan jenis metode pembayaran baru</DialogDescription></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><label className="text-sm font-medium">Nama Metode</label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Contoh: ShopeePay" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Jenis</label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={newType} onChange={(e) => setNewType(e.target.value as PaymentMethod['type'])}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button onClick={handleAdd}>Tambah</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={handleSave}><Save className="mr-1.5 h-4 w-4" />Simpan</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
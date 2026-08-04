'use client';

import { useState, useRef, useCallback, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Pencil,
  Star,
  Power,
  Trash2,
  Copy,
  Banknote,
  QrCode,
  Smartphone,
  Landmark,
  Wallet,
  CreditCard,
  AlertTriangle,
  Upload,
  X,
  ImagePlus,
  CircleDollarSign,
  Building,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentType =
  | 'cash'
  | 'qris'
  | 'transfer'
  | 'virtual_account'
  | 'ewallet'
  | 'debit'
  | 'credit'
  | 'manual'
  | 'other';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  status: string;
  isDefault: boolean;
  sortOrder: number;
  icon?: string | null;
  logo?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  branch?: string | null;
  swiftCode?: string | null;
  phone?: string | null;
  provider?: string | null;
  merchantId?: string | null;
  merchantName?: string | null;
  qrImage?: string | null;
  instructions?: string | null;
  paymentGateway?: string | null;
  cardProvider?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface FormState {
  name: string;
  type: PaymentType;
  description: string;
  status: 'active' | 'inactive';
  isDefault: boolean;
  sortOrder: number;
  logo: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch: string;
  swiftCode: string;
  phone: string;
  provider: string;
  merchantId: string;
  merchantName: string;
  qrImage: string;
  instructions: string;
  paymentGateway: string;
  cardProvider: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  virtual_account: 'Virtual Account',
  ewallet: 'E-Wallet',
  debit: 'Kartu Debit',
  credit: 'Kartu Kredit',
  manual: 'Manual',
  other: 'Lainnya',
};

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string; badge: string }> = {
  cash: { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  qris: { bg: 'bg-violet-100 dark:bg-violet-950/40', text: 'text-violet-600 dark:text-violet-400', icon: 'text-violet-500', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' },
  transfer: { bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  virtual_account: { bg: 'bg-sky-100 dark:bg-sky-950/40', text: 'text-sky-600 dark:text-sky-400', icon: 'text-sky-500', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' },
  ewallet: { bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  debit: { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' },
  credit: { bg: 'bg-rose-100 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400', icon: 'text-rose-500', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
  manual: { bg: 'bg-gray-100 dark:bg-gray-800/40', text: 'text-gray-600 dark:text-gray-400', icon: 'text-gray-500', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400' },
  other: { bg: 'bg-stone-100 dark:bg-stone-800/40', text: 'text-stone-600 dark:text-stone-400', icon: 'text-stone-500', badge: 'bg-stone-100 text-stone-700 dark:bg-stone-800/40 dark:text-stone-400' },
};

const EWALLET_PROVIDERS = [
  { value: 'gojek', label: 'GoPay' },
  { value: 'ovo', label: 'OVO' },
  { value: 'dana', label: 'DANA' },
  { value: 'shopeepay', label: 'ShopeePay' },
  { value: 'linkaja', label: 'LinkAja' },
  { value: '', label: 'Lainnya' },
];

const CARD_PROVIDERS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'jcb', label: 'JCB' },
  { value: 'amex', label: 'Amex' },
];

const PAYMENT_GATEWAYS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'midtrans', label: 'Midtrans' },
  { value: 'xendit', label: 'Xendit' },
  { value: '', label: 'Lainnya' },
];

const EMPTY_FORM: FormState = {
  name: '',
  type: 'cash',
  description: '',
  status: 'active',
  isDefault: false,
  sortOrder: 0,
  logo: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  branch: '',
  swiftCode: '',
  phone: '',
  provider: '',
  merchantId: '',
  merchantName: '',
  qrImage: '',
  instructions: '',
  paymentGateway: '',
  cardProvider: '',
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTypeIcon(type: string) {
  switch (type) {
    case 'cash': return Banknote;
    case 'qris': return QrCode;
    case 'transfer': return Landmark;
    case 'virtual_account': return Building;
    case 'ewallet': return Smartphone;
    case 'debit': return CreditCard;
    case 'credit': return CreditCard;
    case 'manual': return FileText;
    default: return CircleDollarSign;
  }
}

function pmToForm(pm: PaymentMethod): FormState {
  return {
    name: pm.name,
    type: pm.type as PaymentType,
    description: pm.description ?? '',
    status: pm.status as 'active' | 'inactive',
    isDefault: pm.isDefault,
    sortOrder: pm.sortOrder,
    logo: pm.logo ?? '',
    bankName: pm.bankName ?? '',
    accountNumber: pm.accountNumber ?? '',
    accountHolder: pm.accountHolder ?? '',
    branch: pm.branch ?? '',
    swiftCode: pm.swiftCode ?? '',
    phone: pm.phone ?? '',
    provider: pm.provider ?? '',
    merchantId: pm.merchantId ?? '',
    merchantName: pm.merchantName ?? '',
    qrImage: pm.qrImage ?? '',
    instructions: pm.instructions ?? '',
    paymentGateway: pm.paymentGateway ?? '',
    cardProvider: pm.cardProvider ?? '',
  };
}

function formToPayload(form: FormState, id?: string) {
  const payload: Record<string, unknown> = { ...form };
  if (id) payload.id = id;
  // Clean empty strings to null for optional fields
  const optionalFields = ['description', 'logo', 'bankName', 'accountNumber', 'accountHolder', 'branch', 'swiftCode', 'phone', 'provider', 'merchantId', 'merchantName', 'qrImage', 'instructions', 'paymentGateway', 'cardProvider'];
  for (const f of optionalFields) {
    if (payload[f] === '') payload[f] = null;
  }
  return payload;
}

function validateForm(form: FormState): string | null {
  if (!form.name.trim()) return 'Nama metode pembayaran wajib diisi';
  if (!form.type) return 'Jenis pembayaran wajib diisi';
  if (form.type === 'transfer') {
    if (!form.bankName.trim()) return 'Nama bank wajib diisi';
    if (!form.accountNumber.trim()) return 'Nomor rekening wajib diisi';
    if (!form.accountHolder.trim()) return 'Nama pemilik rekening wajib diisi';
  }
  if (form.type === 'qris') {
    if (!form.qrImage) return 'Gambar QR wajib diupload';
  }
  if (form.type === 'ewallet') {
    if (!form.phone.trim()) return 'Nomor HP wajib diisi';
  }
  return null;
}

// ─── Animation ───────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25 },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PaymentMethodSettings() {
  const queryClient = useQueryClient();

  // ── State ──
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // ── Query ──
  const { data, isLoading } = useQuery<{ data: PaymentMethod[] }>({
    queryKey: ['payment-methods', search, filterType, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType && filterType !== 'all') params.set('type', filterType);
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/payment-methods?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal memuat metode pembayaran');
      }
      return res.json();
    },
  });

  const paymentMethods = data?.data ?? [];

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal membuat metode pembayaran');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Metode pembayaran berhasil ditambahkan');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal mengubah metode pembayaran');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Metode pembayaran berhasil diperbarui');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payment-methods?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menghapus metode pembayaran');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Metode pembayaran berhasil dihapus');
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (pm: PaymentMethod) => {
      const newStatus = pm.status === 'active' ? 'inactive' : 'active';
      const res = await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pm.id, status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal mengubah status');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success(variables.status === 'active' ? 'Metode pembayaran dinonaktifkan' : 'Metode pembayaran diaktifkan');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (pm: PaymentMethod) => {
      const res = await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pm.id, isDefault: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menjadikan default');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Metode pembayaran berhasil dijadikan default');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (pm: PaymentMethod) => {
      const payload = { ...pm, id: undefined, name: `${pm.name} (Salinan)`, isDefault: false };
      const { createdAt, updatedAt, deletedAt, ...data } = payload as Record<string, unknown>;
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menduplikasi metode pembayaran');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Metode pembayaran berhasil diduplikasi');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Handlers ──

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const handleOpenAdd = useCallback(() => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: paymentMethods.length });
    setDialogOpen(true);
  }, [paymentMethods.length]);

  const handleOpenEdit = useCallback((pm: PaymentMethod) => {
    setEditingId(pm.id);
    setForm(pmToForm(pm));
    setDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((pm: PaymentMethod) => {
    setDeletingId(pm.id);
    setDeleteDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    const payload = formToPayload(form, editingId ?? undefined);
    if (editingId) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }, [form, editingId, updateMutation, createMutation]);

  const handleImageUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>, field: 'logo' | 'qrImage') => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error('Format file tidak didukung. Gunakan PNG, JPG, JPEG, SVG, atau WEBP.');
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setForm((prev) => ({ ...prev, [field]: base64 }));
      };
      reader.readAsDataURL(file);
      // Reset input
      e.target.value = '';
    },
    []
  );

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render Helpers ──

  const getDetailChips = (pm: PaymentMethod) => {
    const chips: { label: string; value: string }[] = [];
    if (pm.type === 'transfer') {
      if (pm.bankName) chips.push({ label: 'Bank', value: pm.bankName });
      if (pm.accountNumber) chips.push({ label: 'No. Rekening', value: pm.accountNumber });
      if (pm.accountHolder) chips.push({ label: 'Pemilik', value: pm.accountHolder });
    } else if (pm.type === 'qris') {
      if (pm.merchantName) chips.push({ label: 'Merchant', value: pm.merchantName });
      if (pm.merchantId) chips.push({ label: 'ID', value: pm.merchantId });
    } else if (pm.type === 'ewallet') {
      if (pm.provider) {
        const p = EWALLET_PROVIDERS.find((e) => e.value === pm.provider);
        chips.push({ label: 'Provider', value: p?.label ?? pm.provider });
      }
      if (pm.phone) chips.push({ label: 'No. HP', value: pm.phone });
    } else if (pm.type === 'virtual_account') {
      if (pm.provider) chips.push({ label: 'Provider', value: pm.provider });
      if (pm.accountNumber) chips.push({ label: 'No. VA', value: pm.accountNumber });
      if (pm.merchantName) chips.push({ label: 'Perusahaan', value: pm.merchantName });
    } else if (pm.type === 'debit' || pm.type === 'credit') {
      if (pm.cardProvider) {
        const cp = CARD_PROVIDERS.find((c) => c.value === pm.cardProvider);
        chips.push({ label: 'Kartu', value: cp?.label ?? pm.cardProvider });
      }
      if (pm.paymentGateway) {
        const pg = PAYMENT_GATEWAYS.find((g) => g.value === pm.paymentGateway);
        chips.push({ label: 'Gateway', value: pg?.label ?? pm.paymentGateway });
      }
    }
    return chips;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Metode Pembayaran</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola seluruh metode pembayaran yang dapat digunakan oleh kasir saat melakukan transaksi.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Metode Pembayaran
        </Button>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, bank, nomor rekening..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Semua Jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            <SelectItem value="cash">Tunai</SelectItem>
            <SelectItem value="qris">QRIS</SelectItem>
            <SelectItem value="transfer">Transfer Bank</SelectItem>
            <SelectItem value="virtual_account">Virtual Account</SelectItem>
            <SelectItem value="ewallet">E-Wallet</SelectItem>
            <SelectItem value="debit">Kartu Debit</SelectItem>
            <SelectItem value="credit">Kartu Kredit</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="other">Lainnya</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Payment Method List ── */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-64" />
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : paymentMethods.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Wallet className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Belum Ada Metode Pembayaran</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {search || filterType !== 'all' || filterStatus !== 'all'
                ? 'Tidak ada metode pembayaran yang cocok dengan filter Anda. Coba ubah kata kunci atau filter.'
                : 'Mulai tambahkan metode pembayaran pertama untuk digunakan saat transaksi.'}
            </p>
            {!search && filterType === 'all' && filterStatus === 'all' && (
              <Button onClick={handleOpenAdd} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Tambah Metode Pembayaran
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div
          className="space-y-4"
          initial="initial"
          animate="animate"
          variants={{
            animate: { transition: { staggerChildren: 0.06 } },
          }}
        >
          <AnimatePresence mode="popLayout">
            {paymentMethods.map((pm) => {
              const colors = TYPE_COLORS[pm.type] ?? TYPE_COLORS.other;
              const TypeIcon = getTypeIcon(pm.type);
              const detailChips = getDetailChips(pm);
              const isActive = pm.status === 'active';

              return (
                <motion.div key={pm.id} {...fadeIn} layout>
                  <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {/* Icon */}
                        <div
                          className={cn(
                            'flex items-center justify-center h-12 w-12 rounded-full shrink-0',
                            colors.bg
                          )}
                        >
                          <TypeIcon className={cn('h-6 w-6', colors.icon)} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-base truncate">{pm.name}</span>
                            <Badge variant="secondary" className={cn('text-xs', colors.badge)}>
                              {TYPE_LABELS[pm.type] ?? pm.type}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-xs',
                                isActive
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                              )}
                            >
                              {isActive ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                            {pm.isDefault && (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Default
                              </Badge>
                            )}
                          </div>

                          {pm.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{pm.description}</p>
                          )}

                          {/* Detail Chips */}
                          {detailChips.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {detailChips.map((chip) => (
                                <span
                                  key={chip.label}
                                  className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md"
                                >
                                  <span className="text-muted-foreground">{chip.label}:</span>
                                  <span className="font-medium">{chip.value}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 sm:flex-col sm:items-end sm:gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => handleOpenEdit(pm)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          {!pm.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => setDefaultMutation.mutate(pm)}
                              disabled={setDefaultMutation.isPending}
                            >
                              <Star className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Jadikan Default</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-8 gap-1.5 text-xs',
                              isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                            )}
                            onClick={() => toggleStatusMutation.mutate(pm)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => duplicateMutation.mutate(pm)}
                            disabled={duplicateMutation.isPending}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Duplikat</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                            onClick={() => handleOpenDelete(pm)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Hapus</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Ubah informasi metode pembayaran sesuai kebutuhan.'
                : 'Isi informasi metode pembayaran baru yang akan ditambahkan.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ─ Common Fields ─ */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pm-name">
                    Nama Metode <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pm-name"
                    placeholder="Contoh: Tunai, QRIS BCA, GoPay"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pm-type">
                    Jenis Pembayaran <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => updateField('type', v as PaymentType)}
                  >
                    <SelectTrigger id="pm-type">
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tunai</SelectItem>
                      <SelectItem value="qris">QRIS</SelectItem>
                      <SelectItem value="transfer">Transfer Bank</SelectItem>
                      <SelectItem value="virtual_account">Virtual Account</SelectItem>
                      <SelectItem value="ewallet">E-Wallet</SelectItem>
                      <SelectItem value="debit">Kartu Debit</SelectItem>
                      <SelectItem value="credit">Kartu Kredit</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pm-desc">Deskripsi</Label>
                <Textarea
                  id="pm-desc"
                  placeholder="Deskripsi opsional metode pembayaran ini"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="pm-status" className="text-sm font-medium">Status</Label>
                    <p className="text-xs text-muted-foreground">{form.status === 'active' ? 'Aktif' : 'Nonaktif'}</p>
                  </div>
                  <Switch
                    id="pm-status"
                    checked={form.status === 'active'}
                    onCheckedChange={(checked) => updateField('status', checked ? 'active' : 'inactive')}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="pm-default" className="text-sm font-medium">Jadikan Default</Label>
                    <p className="text-xs text-muted-foreground">Metode utama</p>
                  </div>
                  <Switch
                    id="pm-default"
                    checked={form.isDefault}
                    onCheckedChange={(checked) => updateField('isDefault', checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pm-order">Urutan Tampilan</Label>
                  <Input
                    id="pm-order"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => updateField('sortOrder', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ─ Type-Specific Fields ─ */}

            {/* Transfer Bank */}
            {form.type === 'transfer' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Detail Transfer Bank
                </h4>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Upload Logo Bank</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'logo')}
                  />
                  {form.logo ? (
                    <div className="relative inline-block">
                      <img
                        src={form.logo}
                        alt="Logo bank"
                        className="h-16 w-16 rounded-lg object-cover border"
                      />
                      <button
                        type="button"
                        onClick={() => updateField('logo', '')}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 h-16 w-full border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Pilih gambar (PNG, JPG, SVG, WEBP, maks 5MB)</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pm-bank">
                      Nama Bank <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="pm-bank"
                      placeholder="Contoh: BCA, BNI, Mandiri"
                      value={form.bankName}
                      onChange={(e) => updateField('bankName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pm-account">
                      Nomor Rekening <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="pm-account"
                      placeholder="Contoh: 1234567890"
                      value={form.accountNumber}
                      onChange={(e) => updateField('accountNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pm-holder">
                    Nama Pemilik <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pm-holder"
                    placeholder="Nama pemilik rekening"
                    value={form.accountHolder}
                    onChange={(e) => updateField('accountHolder', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pm-branch">Cabang</Label>
                    <Input
                      id="pm-branch"
                      placeholder="Contoh: KCP Jakarta Pusat"
                      value={form.branch}
                      onChange={(e) => updateField('branch', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pm-swift">Kode SWIFT</Label>
                    <Input
                      id="pm-swift"
                      placeholder="Contoh: CENAIDJA"
                      value={form.swiftCode}
                      onChange={(e) => updateField('swiftCode', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pm-transfer-instructions">Petunjuk Pembayaran</Label>
                  <Textarea
                    id="pm-transfer-instructions"
                    placeholder="Petunjuk pembayaran transfer untuk pelanggan"
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* QRIS */}
            {form.type === 'qris' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Detail QRIS
                </h4>

                {/* QR Image Upload */}
                <div className="space-y-2">
                  <Label>
                    Upload Gambar QR <span className="text-red-500">*</span>
                  </Label>
                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'qrImage')}
                  />
                  {form.qrImage ? (
                    <div className="relative inline-block">
                      <div className="rounded-xl border p-2 bg-white dark:bg-gray-900">
                        <img
                          src={form.qrImage}
                          alt="QR Code"
                          className="h-40 w-40 object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField('qrImage', '')}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 h-24 w-full border-dashed"
                      onClick={() => qrFileInputRef.current?.click()}
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <div className="text-left">
                        <span className="text-sm font-medium block">Upload Gambar QR</span>
                        <span className="text-xs text-muted-foreground">PNG, JPG, SVG, WEBP, maks 5MB</span>
                      </div>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pm-merchant">Nama Merchant</Label>
                    <Input
                      id="pm-merchant"
                      placeholder="Nama merchant QRIS"
                      value={form.merchantName}
                      onChange={(e) => updateField('merchantName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pm-mid">Merchant ID</Label>
                    <Input
                      id="pm-mid"
                      placeholder="ID merchant"
                      value={form.merchantId}
                      onChange={(e) => updateField('merchantId', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pm-qris-instructions">Petunjuk Pembayaran</Label>
                  <Textarea
                    id="pm-qris-instructions"
                    placeholder="Petunjuk pembayaran QRIS untuk pelanggan"
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* E-Wallet */}
            {form.type === 'ewallet' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Detail E-Wallet
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pm-ewallet-provider">Provider</Label>
                    <Select value={form.provider} onValueChange={(v) => updateField('provider', v)}>
                      <SelectTrigger id="pm-ewallet-provider">
                        <SelectValue placeholder="Pilih provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {EWALLET_PROVIDERS.map((p) => (
                          <SelectItem key={p.value || 'other'} value={p.value || 'other'}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pm-phone">
                      Nomor HP <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="pm-phone"
                      placeholder="08xxxxxxxxxx"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pm-ewallet-name">Nama Akun</Label>
                  <Input
                    id="pm-ewallet-name"
                    placeholder="Nama akun e-wallet"
                    value={form.merchantName}
                    onChange={(e) => updateField('merchantName', e.target.value)}
                  />
                </div>

                {/* QR Upload for E-Wallet */}
                <div className="space-y-2">
                  <Label>Upload QR</Label>
                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'qrImage')}
                  />
                  {form.qrImage ? (
                    <div className="relative inline-block">
                      <div className="rounded-xl border p-2 bg-white dark:bg-gray-900">
                        <img
                          src={form.qrImage}
                          alt="QR Code"
                          className="h-32 w-32 object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField('qrImage', '')}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 h-20 w-full border-dashed"
                      onClick={() => qrFileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload gambar QR e-wallet</span>
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pm-ewallet-instructions">Petunjuk Pembayaran</Label>
                  <Textarea
                    id="pm-ewallet-instructions"
                    placeholder="Petunjuk pembayaran e-wallet untuk pelanggan"
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Virtual Account */}
            {form.type === 'virtual_account' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Detail Virtual Account
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pm-va-provider">Provider</Label>
                    <Input
                      id="pm-va-provider"
                      placeholder="Contoh: BCA, Mandiri, Permata"
                      value={form.provider}
                      onChange={(e) => updateField('provider', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pm-va-number">Nomor Virtual Account</Label>
                    <Input
                      id="pm-va-number"
                      placeholder="Contoh: 881234567890"
                      value={form.accountNumber}
                      onChange={(e) => updateField('accountNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pm-va-company">Nama Perusahaan</Label>
                  <Input
                    id="pm-va-company"
                    placeholder="Nama perusahaan"
                    value={form.merchantName}
                    onChange={(e) => updateField('merchantName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pm-va-instructions">Petunjuk Pembayaran</Label>
                  <Textarea
                    id="pm-va-instructions"
                    placeholder="Petunjuk pembayaran virtual account untuk pelanggan"
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Kartu Debit */}
            {form.type === 'debit' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Detail Kartu Debit
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="pm-debit-provider">Card Provider</Label>
                  <Select value={form.cardProvider} onValueChange={(v) => updateField('cardProvider', v)}>
                    <SelectTrigger id="pm-debit-provider">
                      <SelectValue placeholder="Pilih provider kartu" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_PROVIDERS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Kartu Kredit */}
            {form.type === 'credit' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Detail Kartu Kredit
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pm-credit-provider">Card Provider</Label>
                    <Select value={form.cardProvider} onValueChange={(v) => updateField('cardProvider', v)}>
                      <SelectTrigger id="pm-credit-provider">
                        <SelectValue placeholder="Pilih provider kartu" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_PROVIDERS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pm-gateway">Payment Gateway</Label>
                    <Select value={form.paymentGateway} onValueChange={(v) => updateField('paymentGateway', v)}>
                      <SelectTrigger id="pm-gateway">
                        <SelectValue placeholder="Pilih gateway" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_GATEWAYS.map((g) => (
                          <SelectItem key={g.value || 'other'} value={g.value || 'other'}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Manual */}
            {form.type === 'manual' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Detail Manual
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="pm-manual-instructions">Petunjuk Pembayaran</Label>
                  <Textarea
                    id="pm-manual-instructions"
                    placeholder="Petunjuk pembayaran manual untuk pelanggan"
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Lainnya */}
            {form.type === 'other' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Detail Lainnya
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="pm-other-instructions">Petunjuk Pembayaran</Label>
                  <Textarea
                    id="pm-other-instructions"
                    placeholder="Petunjuk pembayaran untuk pelanggan"
                    value={form.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
              {isSaving && (
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {editingId ? 'Simpan Perubahan' : 'Tambah Metode'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle>Hapus Metode Pembayaran?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Metode pembayaran yang dihapus tidak dapat dikembalikan. Semua data terkait akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {deleteMutation.isPending && (
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

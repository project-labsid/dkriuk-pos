'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  MapPin,
  Phone,
  Mail,
  Package,
  Receipt,
  Users,
} from 'lucide-react';
import type { Branch } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BranchWithCounts extends Branch {
  _count?: {
    users: number;
    products: number;
    transactions: number;
  };
}

// ─── Form Schema ───────────────────────────────────────────────────────────────

const branchFormSchema = z.object({
  name: z.string().min(1, 'Nama cabang wajib diisi'),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z
    .string()
    .email('Email tidak valid')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
});

type BranchFormData = z.infer<typeof branchFormSchema>;

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function getStatusBadge(isActive: boolean) {
  if (isActive) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        Aktif
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
      Tidak Aktif
    </Badge>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const queryClient = useQueryClient();

  // ── Filter State ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  // ── Dialog State ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  // ── Form ───────────────────────────────────────────────────────────────────
  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
    },
  });

  // ── Query ─────────────────────────────────────────────────────────────────

  const branchesQuery = useQuery<{ data: BranchWithCounts[] }>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Gagal memuat cabang');
      return res.json();
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: BranchFormData) => {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.address) delete payload.address;
      if (!payload.phone) delete payload.phone;
      if (!payload.email) delete payload.email;
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambah cabang');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Cabang berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      closeFormDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BranchFormData) => {
      if (!editingBranch) return;
      const payload: Record<string, unknown> = {
        ...data,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
      };
      const res = await fetch(`/api/branches/${editingBranch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui cabang');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Cabang berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      closeFormDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/branches/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus cabang');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Cabang berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setDeleteOpen(false);
      setDeletingBranch(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // ── Derived Data ────────────────────────────────────────────────────────────

  const allBranches = useMemo(() => {
    const raw = branchesQuery.data?.data ?? [];
    if (!search) return raw;
    const q = search.toLowerCase();
    return raw.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.address && b.address.toLowerCase().includes(q)) ||
        (b.phone && b.phone.toLowerCase().includes(q)) ||
        (b.email && b.email.toLowerCase().includes(q))
    );
  }, [branchesQuery.data, search]);

  const isLoading = branchesQuery.isLoading || branchesQuery.isFetching;
  const isMutating =
    createMutation.isPending || updateMutation.isPending;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openAddDialog = useCallback(() => {
    setEditingBranch(null);
    form.reset({
      name: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
    });
    setFormOpen(true);
  }, [form]);

  const openEditDialog = useCallback(
    (branch: Branch) => {
      setEditingBranch(branch);
      form.reset({
        name: branch.name,
        address: branch.address ?? '',
        phone: branch.phone ?? '',
        email: branch.email ?? '',
        isActive: branch.isActive,
      });
      setFormOpen(true);
    },
    [form]
  );

  const openDeleteDialog = useCallback((branch: Branch) => {
    setDeletingBranch(branch);
    setDeleteOpen(true);
  }, []);

  const closeFormDialog = useCallback(() => {
    setFormOpen(false);
    setEditingBranch(null);
  }, []);

  const onSubmitForm = useCallback(
    (data: BranchFormData) => {
      if (editingBranch) {
        updateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
    },
    [editingBranch, createMutation, updateMutation]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deletingBranch) {
      deleteMutation.mutate(deletingBranch.id);
    }
  }, [deletingBranch, deleteMutation]);

  // ── Form Content ───────────────────────────────────────────────────────────

  const formContent = (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Cabang</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama cabang" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alamat</FormLabel>
              <FormControl>
                <Input placeholder="Alamat cabang (opsional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telepon</FormLabel>
                <FormControl>
                  <Input placeholder="Nomor telepon" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Email cabang"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Status Aktif</FormLabel>
                <p className="text-muted-foreground text-sm">
                  Aktifkan cabang untuk penggunaan
                </p>
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
      </form>
    </Form>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6 p-4 md:p-6"
    >
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cabang</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola cabang toko Anda
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="size-4" />
          Tambah Cabang
        </Button>
      </motion.div>

      {/* ── Search ─────────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari cabang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* ── Cards Grid ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-5 w-[70px] rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : allBranches.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
            <Building2 className="size-8 text-emerald-600" />
          </div>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            {search
              ? 'Tidak ada cabang yang sesuai dengan pencarian'
              : 'Belum ada cabang. Klik "Tambah Cabang" untuk memulai.'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {allBranches.map((branch) => (
            <motion.div key={branch.id} variants={cardVariants}>
              <Card className="hover:shadow-md transition-shadow relative group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="size-5 text-emerald-600" />
                      </div>
                      <CardTitle className="text-base font-semibold leading-tight">
                        {branch.name}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Aksi</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(branch)}
                        >
                          <Pencil className="size-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(branch)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Status badge */}
                  <div className="flex justify-end">
                    {getStatusBadge(branch.isActive)}
                  </div>

                  {/* Contact info */}
                  <div className="space-y-2 text-sm">
                    {branch.address && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="size-3.5 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-3.5 flex-shrink-0" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                    {branch.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="size-3.5 flex-shrink-0" />
                        <span className="truncate">{branch.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 pt-2 border-t">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Package className="size-3" />
                      <span>
                        {branch._count?.products ?? 0} Produk
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Receipt className="size-3" />
                      <span>
                        {branch._count?.transactions ?? 0} Transaksi
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3" />
                      <span>
                        {branch._count?.users ?? 0} Pengguna
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Add/Edit Dialog (Desktop) ───────────────────────────────────────── */}
      <Dialog open={formOpen && !editingBranch} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Cabang Baru</DialogTitle>
            <DialogDescription>
              Isi detail cabang yang akan ditambahkan
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={closeFormDialog}
              disabled={isMutating}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmitForm)}
              disabled={isMutating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isMutating && <Loader2 className="size-4 animate-spin" />}
              {isMutating ? 'Menyimpan...' : 'Simpan Cabang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog (Desktop) ───────────────────────────────────────────── */}
      <Dialog
        open={formOpen && !!editingBranch}
        onOpenChange={setFormOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Cabang</DialogTitle>
            <DialogDescription>
              Ubah detail cabang {editingBranch?.name}
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={closeFormDialog}
              disabled={isMutating}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmitForm)}
              disabled={isMutating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isMutating && <Loader2 className="size-4 animate-spin" />}
              {isMutating ? 'Menyimpan...' : 'Perbarui Cabang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Sheet (Mobile) ───────────────────────────────────────────── */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent
          side="bottom"
          className="sm:max-h-[85vh] rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>
              {editingBranch ? 'Edit Cabang' : 'Tambah Cabang Baru'}
            </SheetTitle>
            <SheetDescription>
              {editingBranch
                ? 'Ubah detail cabang'
                : 'Isi detail cabang yang akan ditambahkan'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {formContent}
          </div>
          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeFormDialog}
              disabled={isMutating}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={form.handleSubmit(onSubmitForm)}
              disabled={isMutating}
            >
              {isMutating && <Loader2 className="size-4 animate-spin" />}
              {isMutating ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation Dialog ────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Cabang?</AlertDialogTitle>
            <AlertDialogDescription>
              Cabang{' '}
              <span className="font-semibold">
                {deletingBranch?.name}
              </span>{' '}
              akan dihapus secara permanen. Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

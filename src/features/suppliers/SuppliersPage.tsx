'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Truck,
} from 'lucide-react';
import type { Supplier, PaginatedResponse } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Form Schema ───────────────────────────────────────────────────────────────

const supplierFormSchema = z.object({
  name: z.string().min(1, 'Nama supplier wajib diisi'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
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

export default function SuppliersPage() {
  const queryClient = useQueryClient();

  // ── Filter State ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // ── Dialog State ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // ── Form ───────────────────────────────────────────────────────────────────
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      isActive: true,
    },
  });

  // ── Query ─────────────────────────────────────────────────────────────────

  const suppliersQuery = useQuery<PaginatedResponse<Supplier>>({
    queryKey: ['suppliers', page, perPage, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
      });
      if (search) params.set('search', search);
      const res = await fetch(`/api/suppliers?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat supplier');
      return res.json();
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.phone) delete payload.phone;
      if (!payload.email) delete payload.email;
      if (!payload.address) delete payload.address;
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambah supplier');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Supplier berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      closeFormDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      if (!editingSupplier) return;
      const payload: Record<string, unknown> = { ...data };
      if (!payload.phone) payload.phone = null;
      if (!payload.email) payload.email = null;
      if (!payload.address) payload.address = null;
      const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui supplier');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Supplier berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      closeFormDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus supplier');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Supplier berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDeleteOpen(false);
      setDeletingSupplier(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // ── Derived Data ────────────────────────────────────────────────────────────

  const suppliers = suppliersQuery.data?.data ?? [];
  const totalSuppliers = suppliersQuery.data?.total ?? 0;
  const totalPages = suppliersQuery.data?.totalPages ?? 1;
  const isLoading = suppliersQuery.isLoading || suppliersQuery.isFetching;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, totalSuppliers);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openAddDialog = useCallback(() => {
    setEditingSupplier(null);
    form.reset({
      name: '',
      phone: '',
      email: '',
      address: '',
      isActive: true,
    });
    setFormOpen(true);
  }, [form]);

  const openEditDialog = useCallback(
    (supplier: Supplier) => {
      setEditingSupplier(supplier);
      form.reset({
        name: supplier.name,
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        address: supplier.address ?? '',
        isActive: supplier.isActive,
      });
      setFormOpen(true);
    },
    [form]
  );

  const openDeleteDialog = useCallback((supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setDeleteOpen(true);
  }, []);

  const closeFormDialog = useCallback(() => {
    setFormOpen(false);
    setEditingSupplier(null);
  }, []);

  const onSubmitForm = useCallback(
    (data: SupplierFormData) => {
      if (editingSupplier) {
        updateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
    },
    [editingSupplier, createMutation, updateMutation]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deletingSupplier) {
      deleteMutation.mutate(deletingSupplier.id);
    }
  }, [deletingSupplier, deleteMutation]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handlePerPageChange = useCallback((value: string) => {
    setPerPage(Number(value));
    setPage(1);
  }, []);

  // ── Table Columns ─────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Supplier>[]>(() => [
      {
        accessorKey: 'index',
        header: 'No',
        size: 50,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.index + 1}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Nama',
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Telepon',
        size: 130,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.phone || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        size: 180,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm truncate block max-w-[180px]">
            {row.original.email || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'address',
        header: 'Alamat',
        size: 200,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm truncate block max-w-[200px]">
            {row.original.address || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        size: 120,
        cell: ({ row }) => getStatusBadge(row.original.isActive),
      },
      {
        id: 'actions',
        header: 'Aksi',
        size: 80,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <Pencil className="size-4" />
                <span className="sr-only">Aksi</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
                <Pencil className="size-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openDeleteDialog(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [openEditDialog, openDeleteDialog]
  );

  // ── Table ─────────────────────────────────────────────────────────────────

  const table = useReactTable({
    data: suppliers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: { pageIndex: page - 1, pageSize: perPage },
    },
  });

  // ── Form Content ───────────────────────────────────────────────────────────

  const formContent = (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Supplier</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama supplier" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telepon</FormLabel>
              <FormControl>
                <Input placeholder="Nomor telepon supplier" {...field} />
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
                  placeholder="Email supplier (opsional)"
                  {...field}
                />
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
                <Textarea placeholder="Alamat lengkap supplier" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Status Aktif</FormLabel>
                <p className="text-muted-foreground text-sm">
                  Aktifkan supplier untuk digunakan
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
          <h1 className="text-2xl font-bold tracking-tight">Supplier</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola daftar supplier toko Anda
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4" />
          Tambah Supplier
        </Button>
      </motion.div>

      {/* ── Search & Table ────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="border rounded-xl bg-card shadow-sm"
      >
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari supplier..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: perPage }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[160px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[80px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Truck className="size-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">
                        {search
                          ? 'Tidak ada supplier yang sesuai dengan pencarian'
                          : 'Belum ada supplier. Klik "Tambah Supplier" untuk memulai.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────────── */}
        {totalSuppliers > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                Menampilkan {startItem}-{endItem} dari {totalSuppliers}
              </span>
              <Select value={String(perPage)} onValueChange={handlePerPageChange}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>per halaman</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4" />
                <span className="sm:hidden">Sebelumnya</span>
              </Button>
              <div className="flex items-center gap-1 text-sm">
                <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground font-medium">
                  {page}
                </span>
                <span className="text-muted-foreground">dari {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <span className="sm:hidden">Berikutnya</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Add Dialog (Desktop) ──────────────────────────────────────────────── */}
      <Dialog open={formOpen && !editingSupplier} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Supplier Baru</DialogTitle>
            <DialogDescription>
              Isi detail supplier yang akan ditambahkan
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={closeFormDialog} disabled={isMutating}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmitForm)}
              disabled={isMutating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isMutating && <Loader2 className="size-4 animate-spin" />}
              {isMutating ? 'Menyimpan...' : 'Simpan Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog (Desktop) ────────────────────────────────────────────── */}
      <Dialog open={formOpen && !!editingSupplier} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Ubah detail supplier {editingSupplier?.name}
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={closeFormDialog} disabled={isMutating}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmitForm)}
              disabled={isMutating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isMutating && <Loader2 className="size-4 animate-spin" />}
              {isMutating ? 'Menyimpan...' : 'Perbarui Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Sheet (Mobile) ──────────────────────────────────────────── */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="bottom" className="sm:max-h-[85vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
            </SheetTitle>
            <SheetDescription>
              {editingSupplier
                ? 'Ubah detail supplier'
                : 'Isi detail supplier yang akan ditambahkan'}
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
            <AlertDialogTitle>Hapus Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Supplier <span className="font-semibold">{deletingSupplier?.name}</span>{' '}
              akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
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
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

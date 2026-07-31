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
  getFilteredRowModel,
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
  FolderOpen,
} from 'lucide-react';
import type { Category } from '@/types';

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

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryWithCount extends Category {
  _count?: { products: number };
}

// ─── Form Schema ───────────────────────────────────────────────────────────────

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  description: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

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

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  // ── Filter State ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  // ── Dialog State ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // ── Form ───────────────────────────────────────────────────────────────────
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });

  // ── Query ─────────────────────────────────────────────────────────────────

  const categoriesQuery = useQuery<{ data: CategoryWithCount[] }>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Gagal memuat kategori');
      return res.json();
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.description) delete payload.description;
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambah kategori');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Kategori berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      closeFormDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!editingCategory) return;
      const payload: Record<string, unknown> = { ...data };
      if (!payload.description) payload.description = null;
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui kategori');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Kategori berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      closeFormDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus kategori');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Kategori berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteOpen(false);
      setDeletingCategory(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // ── Derived Data ────────────────────────────────────────────────────────────

  const allCategories: Category[] = useMemo(() => {
    const raw = categoriesQuery.data?.data ?? [];
    return raw.map((c) => ({
      ...c,
      productCount: c._count?.products ?? c.productCount ?? 0,
    }));
  }, [categoriesQuery.data]);

  const isLoading = categoriesQuery.isLoading || categoriesQuery.isFetching;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openAddDialog = useCallback(() => {
    setEditingCategory(null);
    form.reset({ name: '', description: '', isActive: true });
    setFormOpen(true);
  }, [form]);

  const openEditDialog = useCallback(
    (category: Category) => {
      setEditingCategory(category);
      form.reset({
        name: category.name,
        description: category.description ?? '',
        isActive: category.isActive,
      });
      setFormOpen(true);
    },
    [form]
  );

  const openDeleteDialog = useCallback((category: Category) => {
    setDeletingCategory(category);
    setDeleteOpen(true);
  }, []);

  const closeFormDialog = useCallback(() => {
    setFormOpen(false);
    setEditingCategory(null);
  }, []);

  const onSubmitForm = useCallback(
    (data: CategoryFormData) => {
      if (editingCategory) {
        updateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
    },
    [editingCategory, createMutation, updateMutation]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deletingCategory) {
      deleteMutation.mutate(deletingCategory.id);
    }
  }, [deletingCategory, deleteMutation]);

  // ── Table Columns ─────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
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
        accessorKey: 'description',
        header: 'Deskripsi',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm max-w-[200px] truncate block">
            {row.original.description || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'productCount',
        header: 'Jumlah Produk',
        size: 120,
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.productCount ?? 0}</Badge>
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
    data: allCategories,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setSearch,
    state: {
      globalFilter: search,
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const name = row.original.name.toLowerCase();
      return name.includes((filterValue as string).toLowerCase());
    },
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const { pageSize } = table.getState().pagination;
  const totalItems = table.getFilteredRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const startItem = currentPage * pageSize - pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // ── Form Content ───────────────────────────────────────────────────────────

  const formContent = (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Kategori</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama kategori" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Deskripsi opsional (boleh dikosongkan)"
                  {...field}
                />
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
                  Aktifkan kategori untuk ditampilkan
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
          <h1 className="text-2xl font-bold tracking-tight">Kategori</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola kategori produk toko Anda
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4" />
          Tambah Kategori
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
              placeholder="Cari kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[60px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[80px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : allCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderOpen className="size-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">
                        {search
                          ? 'Tidak ada kategori yang sesuai dengan pencarian'
                          : 'Belum ada kategori. Klik "Tambah Kategori" untuk memulai.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderOpen className="size-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">
                        Tidak ada kategori yang sesuai dengan pencarian
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
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Menampilkan {startItem}-{endItem} dari {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="size-4" />
                <span className="sm:hidden">Sebelumnya</span>
              </Button>
              <div className="flex items-center gap-1 text-sm">
                <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground font-medium">
                  {currentPage}
                </span>
                <span className="text-muted-foreground">dari {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sm:hidden">Berikutnya</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Add/Edit Dialog (Desktop) ───────────────────────────────────────── */}
      <Dialog open={formOpen && !editingCategory} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Kategori Baru</DialogTitle>
            <DialogDescription>
              Isi detail kategori yang akan ditambahkan
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
              {isMutating ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog (Desktop) ───────────────────────────────────────────── */}
      <Dialog open={formOpen && !!editingCategory} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Kategori</DialogTitle>
            <DialogDescription>
              Ubah detail kategori {editingCategory?.name}
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
              {isMutating ? 'Menyimpan...' : 'Perbarui Kategori'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Sheet (Mobile) ───────────────────────────────────────────── */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="bottom" className="sm:max-h-[85vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </SheetTitle>
            <SheetDescription>
              {editingCategory
                ? 'Ubah detail kategori'
                : 'Isi detail kategori yang akan ditambahkan'}
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
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori <span className="font-semibold">{deletingCategory?.name}</span>{' '}
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

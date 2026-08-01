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
import { useForm, useFieldArray, type Control } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  PackageOpen,
  Trash2,
} from 'lucide-react';
import type { Purchase, PurchaseItem, Supplier, Product, PaginatedResponse } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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

function getStatusBadge(status: string) {
  switch (status) {
    case 'received':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          Diterima
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
          Tertunda
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          Dibatalkan
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Form Schema ──────────────────────────────────────────────────────────────

const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  quantity: z.coerce.number().int().min(1, 'Minimal 1'),
  costPrice: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
});

type PurchaseItemFormData = z.infer<typeof purchaseItemSchema>;

const purchaseFormSchema = z.object({
  supplierId: z.string().min(1, 'Supplier wajib dipilih'),
  notes: z.string().optional().or(z.literal('')),
  items: z.array(purchaseItemSchema).min(1, 'Minimal 1 item pembelian'),
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

// ─── Product Select Field ─────────────────────────────────────────────────────

interface ProductSelectFieldProps {
  control: Control<PurchaseFormData>;
  index: number;
  products: Product[];
  productsLoading: boolean;
  onProductChange: (index: number, productId: string) => void;
}

function ProductSelectField({ control, index, products, productsLoading, onProductChange }: ProductSelectFieldProps) {
  return (
    <FormField
      control={control}
      name={`items.${index}.productId`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="sr-only">Produk</FormLabel>
          <FormControl>
            <Select
              value={field.value}
              onValueChange={(val) => {
                field.onChange(val);
                onProductChange(index, val);
              }}
              disabled={productsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={productsLoading ? 'Memuat produk...' : 'Pilih produk'} />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span className="truncate">{product.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Stok: {product.stock} {product.unit}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PurchasesPage() {
  const queryClient = useQueryClient();

  // ── Filter State ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // ── Dialog State ────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── Form ───────────────────────────────────────────────────────────────────
  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: '',
      notes: '',
      items: [{ productId: '', quantity: 1, costPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  const purchasesQuery = useQuery<PaginatedResponse<Purchase>>({
    queryKey: ['purchases', page, perPage, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
      });
      if (search) params.set('search', search);
      const res = await fetch(`/api/purchases?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat pembelian');
      return res.json();
    },
  });

  const suppliersQuery = useQuery<Supplier[]>({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers?perPage=100');
      if (!res.ok) throw new Error('Gagal memuat supplier');
      const data = await res.json();
      return data.data ?? data;
    },
  });

  const productsQuery = useQuery<Product[]>({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res = await fetch('/api/products?perPage=200');
      if (!res.ok) throw new Error('Gagal memuat produk');
      const data = await res.json();
      return data.data ?? data;
    },
  });

  const detailQuery = useQuery({
    queryKey: ['purchase-detail', detailId],
    queryFn: async () => {
      if (!detailId) throw new Error('No ID');
      const res = await fetch(`/api/purchases/${detailId}`);
      if (!res.ok) throw new Error('Gagal memuat detail pembelian');
      const json = await res.json();
      return json.data as Purchase & { items: (PurchaseItem & { product?: Product })[] };
    },
    enabled: !!detailId,
  });

  // ── Mutation ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const payload = {
        supplierId: data.supplierId,
        notes: data.notes || undefined,
        items: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          costPrice: item.costPrice,
        })),
      };
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambah pembelian');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Pembelian berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeAddDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // ── Derived Data ────────────────────────────────────────────────────────────

  const purchases = purchasesQuery.data?.data ?? [];
  const totalPurchases = purchasesQuery.data?.total ?? 0;
  const totalPages = purchasesQuery.data?.totalPages ?? 1;
  const isLoading = purchasesQuery.isLoading || purchasesQuery.isFetching;
  const isMutating = createMutation.isPending;
  const suppliers = suppliersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const detailData = detailQuery.data;

  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, totalPurchases);

  // Watch items for grand total
  const watchItems = form.watch('items');
  const grandTotal = useMemo(() => {
    return watchItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  }, [watchItems]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openAddDialog = useCallback(() => {
    form.reset({
      supplierId: '',
      notes: '',
      items: [{ productId: '', quantity: 1, costPrice: 0 }],
    });
    setAddOpen(true);
  }, [form]);

  const closeAddDialog = useCallback(() => {
    setAddOpen(false);
  }, []);

  const openDetail = useCallback((id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setTimeout(() => setDetailId(null), 200);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handlePerPageChange = useCallback((value: string) => {
    setPerPage(Number(value));
    setPage(1);
  }, []);

  const handleAddItem = useCallback(() => {
    append({ productId: '', quantity: 1, costPrice: 0 });
  }, [append]);

  const handleProductChange = useCallback(
    (index: number, productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        form.setValue(`items.${index}.costPrice`, product.costPrice, { shouldValidate: true });
      }
    },
    [form, products],
  );

  const onSubmitForm = useCallback(
    (data: PurchaseFormData) => {
      createMutation.mutate(data);
    },
    [createMutation],
  );

  // ── Table Columns ─────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Purchase>[]>(
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
        accessorKey: 'invoiceNumber',
        header: 'Invoice',
        size: 170,
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.invoiceNumber}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Tanggal',
        size: 130,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: 'supplier',
        header: 'Supplier',
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.supplier?.name || '-'}</span>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total',
        size: 150,
        cell: ({ row }) => (
          <span className="font-medium text-sm">{formatRupiah(row.original.totalAmount)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 110,
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: 'actions',
        header: 'Aksi',
        size: 80,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(row.original.id);
            }}
          >
            <Eye className="size-4 mr-1" />
            Detail
          </Button>
        ),
      },
    ],
    [openDetail],
  );

  // ── Table ─────────────────────────────────────────────────────────────────

  const table = useReactTable({
    data: purchases,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: { pageIndex: page - 1, pageSize: perPage },
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6 p-4 md:p-6"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pembelian Barang</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola pembelian barang dari supplier
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4" />
          Tambah Pembelian
        </Button>
      </motion.div>

      {/* ── Search & Table ──────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="border rounded-xl bg-card shadow-sm"
      >
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari nomor invoice..."
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
                    <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[110px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[130px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[90px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageOpen className="size-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">
                        {search
                          ? 'Tidak ada pembelian yang sesuai dengan pencarian'
                          : 'Belum ada pembelian. Klik "Tambah Pembelian" untuk memulai.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(row.original.id)}
                  >
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

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {totalPurchases > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                Menampilkan {startItem}-{endItem} dari {totalPurchases}
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

      {/* ── Add Purchase Dialog ────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) closeAddDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Pembelian</DialogTitle>
            <DialogDescription>
              Isi detail pembelian barang dari supplier
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              {/* Supplier & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Catatan pembelian (opsional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Items Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Item Pembelian</h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="size-4" />
                  Tambah Item
                </Button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const itemTotal = (watchItems[index]?.quantity ?? 0) * (watchItems[index]?.costPrice ?? 0);
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-2 items-start border rounded-lg p-3 bg-muted/30"
                    >
                      {/* Product Select - spans 4 cols on sm+ */}
                      <div className="col-span-12 sm:col-span-4">
                        <Label className="text-xs text-muted-foreground mb-1 block">Produk</Label>
                        <ProductSelectField
                          control={form.control}
                          index={index}
                          products={products}
                          productsLoading={productsQuery.isLoading}
                          onProductChange={handleProductChange}
                        />
                      </div>

                      {/* Qty */}
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">Qty</Label>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field: qtyField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  className="h-9"
                                  {...qtyField}
                                  onChange={(e) => qtyField.onChange(e.target.valueAsNumber || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Cost Price */}
                      <div className="col-span-4 sm:col-span-3">
                        <Label className="text-xs text-muted-foreground mb-1 block">Harga Beli</Label>
                        <FormField
                          control={form.control}
                          name={`items.${index}.costPrice`}
                          render={({ field: priceField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-9"
                                  {...priceField}
                                  onChange={(e) => priceField.onChange(e.target.valueAsNumber || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Total + Remove */}
                      <div className="col-span-4 sm:col-span-3 flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground mb-1 block">Total</Label>
                          <div className="h-9 px-3 flex items-center text-sm font-medium rounded-md border bg-muted/50">
                            {formatRupiah(itemTotal)}
                          </div>
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 text-destructive hover:text-destructive hover:bg-red-50 shrink-0"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {form.formState.errors.items?.root && (
                <p className="text-sm text-destructive">{form.formState.errors.items.root.message}</p>
              )}

              <Separator />

              {/* Grand Total */}
              <div className="flex items-center justify-between py-2">
                <span className="font-semibold text-base">Grand Total</span>
                <span className="font-bold text-lg text-emerald-600">{formatRupiah(grandTotal)}</span>
              </div>
            </form>
          </Form>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={closeAddDialog} disabled={isMutating}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmitForm)}
              disabled={isMutating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isMutating && <Loader2 className="size-4 animate-spin" />}
              {isMutating ? 'Menyimpan...' : 'Simpan Pembelian'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={closeDetail}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pembelian</DialogTitle>
            <DialogDescription>
              Rincian pembelian {detailData?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : detailData ? (
            <div className="space-y-6">
              {/* Purchase Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">No. Invoice</Label>
                  <p className="font-mono font-medium text-sm">{detailData.invoiceNumber}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Tanggal</Label>
                  <p className="text-sm">{formatDate(detailData.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Supplier</Label>
                  <p className="text-sm font-medium">{detailData.supplier?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-0.5">{getStatusBadge(detailData.status)}</div>
                </div>
                {detailData.notes && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-muted-foreground text-xs">Catatan</Label>
                    <p className="text-sm">{detailData.notes}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Items Table */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Item Pembelian</h4>
                <ScrollArea className="max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">No</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Harga Beli</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detailData.items ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                            Tidak ada item
                          </TableCell>
                        </TableRow>
                      ) : (
                        (detailData.items ?? []).map((item, idx: number) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                            <TableCell className="text-sm font-medium">{item.product?.name ?? item.productId}</TableCell>
                            <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{formatRupiah(item.costPrice)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatRupiah(item.total)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <Separator />

              {/* Grand Total */}
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-base">Total Pembelian</span>
                <span className="font-bold text-lg text-emerald-600">{formatRupiah(detailData.totalAmount)}</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

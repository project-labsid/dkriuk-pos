'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardCheck,
  History,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn, formatRupiah } from '@/lib/utils';
import type { StockAdjustment, Product, PaginatedResponse } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}



const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  in: { label: 'Masuk', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <ArrowDownCircle className="h-3.5 w-3.5" /> },
  out: { label: 'Keluar', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
  adjustment: { label: 'Adjustment', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <History className="h-3.5 w-3.5" /> },
  opname: { label: 'Opname', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
};

// ─── Product Search Select ────────────────────────────────────────────────────

function ProductSearchSelect({
  value,
  onChange,
  selectedStock,
}: {
  value: string;
  onChange: (id: string) => void;
  selectedStock?: number;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products-search', search],
    queryFn: async () => {
      const params = new URLSearchParams({ perPage: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error('Gagal memuat produk');
      const json = (await res.json()) as PaginatedResponse<Product>;
      return json.data;
    },
  });

  const selected = data?.find((p) => p.id === value);

  return (
    <div className="space-y-1.5">
      <Label>Pilih Produk</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{selected.name}</span>
                {selectedStock !== undefined && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Stok: {selectedStock}
                  </Badge>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Cari produk...</span>
            )}
            <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Cari nama produk..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  'Produk tidak ditemukan'
                )}
              </CommandEmpty>
              <CommandGroup>
                {data?.map((product) => (
                  <CommandItem
                    key={product.id}
                  value={`${product.name} ${product.sku || ''} ${product.barcode || ''}`}
                  onSelect={() => {
                    onChange(product.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-sm">{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Stok: {product.stock} · {formatRupiah(product.sellPrice)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Riwayat Stok Tab ─────────────────────────────────────────────────────────

function RiwayatStokTab() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stock-history', page, perPage, typeFilter, search, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
      });
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/stock?${params}`);
      if (!res.ok) throw new Error('Gagal memuat riwayat stok');
      return res.json() as Promise<PaginatedResponse<StockAdjustment & { user?: { id: string; name: string; email: string } }>>;
    },
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleClearFilters = useCallback(() => {
    setTypeFilter('');
    setSearch('');
    setSearchInput('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Cari Produk</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama produk..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">Tipe</Label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="mt-1 w-full sm:w-[160px]">
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="in">Masuk</SelectItem>
                  <SelectItem value="out">Keluar</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="opname">Opname</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">Tanggal Mulai</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="mt-1"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">Tanggal Akhir</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSearch}>
                <Search className="mr-1.5 h-4 w-4" />
                Cari
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearFilters}>
                <X className="mr-1.5 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-background z-10">
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Stok Sebelum</TableHead>
                  <TableHead className="text-right">Stok Sesudah</TableHead>
                  <TableHead className="hidden md:table-cell">Alasan</TableHead>
                  <TableHead className="hidden lg:table-cell">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isError || !data?.data?.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      {isError ? 'Gagal memuat data' : 'Tidak ada riwayat stok'}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((item, idx) => {
                    const cfg = typeConfig[item.type] || typeConfig.adjustment;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">
                          {(page - 1) * perPage + idx + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(item.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.product?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn('gap-1 font-medium', cfg.color)}>
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.previousStock}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {item.newStock}
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                          {item.reason || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {item.user?.name || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Halaman {data.page} dari {data.totalPages} · {data.total} data
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stok Masuk Tab ───────────────────────────────────────────────────────────

const stockInSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  reason: z.string().optional(),
});

type StockInForm = z.infer<typeof stockInSchema>;

function StokMasukTab() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState('');

  const form = useForm<StockInForm>({
    resolver: zodResolver(stockInSchema),
    defaultValues: { productId: '', quantity: 1, reason: '' },
  });

  const { data: selectedProduct } = useQuery({
    queryKey: ['product', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await fetch(`/api/products/${selectedProductId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as Product;
    },
    enabled: !!selectedProductId,
  });

  const mutation = useMutation({
    mutationFn: async (values: StockInForm) => {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, type: 'in', userId: '' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menambahkan stok');
      return json;
    },
    onSuccess: () => {
      toast.success('Stok masuk berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['stock-history'] });
      queryClient.invalidateQueries({ queryKey: ['products-search'] });
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] });
      form.reset();
      setSelectedProductId('');
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: StockInForm) => mutation.mutate(values);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-emerald-500" />
            Tambah Stok Masuk
          </CardTitle>
          <CardDescription>
            Tambahkan jumlah stok baru untuk produk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ProductSearchSelect
                value={selectedProductId}
                onChange={(id) => {
                  setSelectedProductId(id);
                  form.setValue('productId', id);
                }}
              />
              {selectedProduct && (
                <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Stok Saat Ini</span>
                    <span className="font-mono font-medium">{selectedProduct.stock} {selectedProduct.unit}</span>
                    <span className="text-muted-foreground">Harga Jual</span>
                    <span className="font-mono">{formatRupiah(selectedProduct.sellPrice)}</span>
                  </div>
                </div>
              )}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Masukkan jumlah"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alasan (opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Misal: Pembelian dari supplier"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Simpan Stok Masuk
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Stok Keluar Tab ──────────────────────────────────────────────────────────

const stockOutSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  reason: z.string().optional(),
});

type StockOutForm = z.infer<typeof stockOutSchema>;

function StokKeluarTab() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState('');

  const form = useForm<StockOutForm>({
    resolver: zodResolver(stockOutSchema),
    defaultValues: { productId: '', quantity: 1, reason: '' },
  });

  const { data: selectedProduct } = useQuery({
    queryKey: ['product', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await fetch(`/api/products/${selectedProductId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as Product;
    },
    enabled: !!selectedProductId,
  });

  const mutation = useMutation({
    mutationFn: async (values: StockOutForm) => {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, type: 'out', userId: '' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengurangi stok');
      return json;
    },
    onSuccess: () => {
      toast.success('Stok keluar berhasil dicatat');
      queryClient.invalidateQueries({ queryKey: ['stock-history'] });
      queryClient.invalidateQueries({ queryKey: ['products-search'] });
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] });
      form.reset();
      setSelectedProductId('');
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: StockOutForm) => mutation.mutate(values);

  const currentStock = selectedProduct?.stock ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-red-500" />
            Catat Stok Keluar
          </CardTitle>
          <CardDescription>
            Kurangi stok produk (rusak, kadaluarsa, dll)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ProductSearchSelect
                value={selectedProductId}
                onChange={(id) => {
                  setSelectedProductId(id);
                  form.setValue('productId', id);
                }}
              />
              {selectedProduct && (
                <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Stok Saat Ini</span>
                    <span className={cn('font-mono font-medium', currentStock <= selectedProduct.minStock && 'text-red-600')}>
                      {currentStock} {selectedProduct.unit}
                    </span>
                    <span className="text-muted-foreground">Harga Jual</span>
                    <span className="font-mono">{formatRupiah(selectedProduct.sellPrice)}</span>
                  </div>
                </div>
              )}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={currentStock || undefined}
                        placeholder="Masukkan jumlah"
                        {...field}
                      />
                    </FormControl>
                    {currentStock > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Maksimal: {currentStock} {selectedProduct?.unit}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alasan (opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Misal: Produk rusak / kadaluarsa"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Simpan Stok Keluar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Stock Opname Tab ─────────────────────────────────────────────────────────

const stockOpnameSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  actualStock: z.coerce.number().int().min(0, 'Stok aktual minimal 0'),
  reason: z.string().optional(),
});

type StockOpnameForm = z.infer<typeof stockOpnameSchema>;

function StockOpnameTab() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState('');

  const form = useForm<StockOpnameForm>({
    resolver: zodResolver(stockOpnameSchema),
    defaultValues: { productId: '', actualStock: 0, reason: '' },
  });

  const { data: selectedProduct, isLoading: productLoading } = useQuery({
    queryKey: ['product', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await fetch(`/api/products/${selectedProductId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as Product;
    },
    enabled: !!selectedProductId,
  });

  const mutation = useMutation({
    mutationFn: async (values: StockOpnameForm) => {
      const res = await fetch('/api/stock/opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, userId: '' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal melakukan stock opname');
      return json;
    },
    onSuccess: () => {
      toast.success('Stock opname berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['stock-history'] });
      queryClient.invalidateQueries({ queryKey: ['products-search'] });
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] });
      form.reset();
      setSelectedProductId('');
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: StockOpnameForm) => mutation.mutate(values);

  const currentStock = selectedProduct?.stock ?? 0;
  const actualStock = form.watch('actualStock') || 0;
  const difference = actualStock - currentStock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-500" />
            Stock Opname
          </CardTitle>
          <CardDescription>
            Hitung ulang stok aktual di gudang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ProductSearchSelect
                value={selectedProductId}
                onChange={(id) => {
                  setSelectedProductId(id);
                  form.setValue('productId', id);
                }}
              />

              {productLoading && selectedProductId && (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              )}

              {selectedProduct && !productLoading && (
                <>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Perbandingan Stok</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Stok Sistem</p>
                        <p className="text-lg font-mono font-bold">{currentStock}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="h-px flex-1 bg-border" />
                        <span className="mx-2 text-muted-foreground">→</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Stok Aktual</p>
                        <p className={cn(
                          'text-lg font-mono font-bold',
                          difference > 0 && 'text-emerald-600',
                          difference < 0 && 'text-red-600',
                          difference === 0 && 'text-muted-foreground'
                        )}>
                          {actualStock}
                        </p>
                      </div>
                    </div>
                    {difference !== 0 && (
                      <p className={cn(
                        'mt-2 text-center text-sm font-medium',
                        difference > 0 && 'text-emerald-600',
                        difference < 0 && 'text-red-600'
                      )}>
                        {difference > 0 ? `+${difference}` : difference} ({difference > 0 ? 'kelebihan' : 'kekurangan'})
                      </p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="actualStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stok Aktual</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Masukkan jumlah stok aktual"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {!selectedProductId && (
                <FormField
                  control={form.control}
                  name="actualStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stok Aktual</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Pilih produk terlebih dahulu"
                          disabled
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan (opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Catatan tambahan untuk stock opname"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={mutation.isPending || !selectedProductId}
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                )}
                Simpan Stock Opname
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StockPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Stok</h1>
        <p className="text-muted-foreground">Kelola stok masuk, keluar, dan stock opname</p>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="history" className="flex-1 min-w-[120px]">
            <History className="mr-2 h-4 w-4" />
            Riwayat Stok
          </TabsTrigger>
          <TabsTrigger value="in" className="flex-1 min-w-[120px]">
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            Stok Masuk
          </TabsTrigger>
          <TabsTrigger value="out" className="flex-1 min-w-[120px]">
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Stok Keluar
          </TabsTrigger>
          <TabsTrigger value="opname" className="flex-1 min-w-[120px]">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Stock Opname
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <RiwayatStokTab />
          </motion.div>
        </TabsContent>
        <TabsContent value="in">
          <StokMasukTab />
        </TabsContent>
        <TabsContent value="out">
          <StokKeluarTab />
        </TabsContent>
        <TabsContent value="opname">
          <StockOpnameTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

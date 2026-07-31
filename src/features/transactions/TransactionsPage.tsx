'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  useQuery,
} from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Receipt,
  Loader2,
  CalendarDays,
  Filter,
  X,
  Banknote,
  QrCode,
  ArrowLeftRight,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import type { Transaction, TransactionItem, PaginatedResponse } from '@/types';

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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string): string {
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

// ─── Status / Payment Badges ─────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          Selesai
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          Dibatalkan
        </Badge>
      );
    case 'held':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
          Ditahan
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getPaymentBadge(method: string) {
  const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    tunai: {
      label: 'Tunai',
      icon: <Banknote className="size-3" />,
      className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
    },
    qris: {
      label: 'QRIS',
      icon: <QrCode className="size-3" />,
      className: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100',
    },
    transfer: {
      label: 'Transfer',
      icon: <ArrowLeftRight className="size-3" />,
      className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
    },
    debit: {
      label: 'Debit',
      icon: <CreditCard className="size-3" />,
      className: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
    },
    kredit: {
      label: 'Kredit',
      icon: <CreditCard className="size-3" />,
      className: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
    },
    'e-wallet': {
      label: 'E-Wallet',
      icon: <Smartphone className="size-3" />,
      className: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100',
    },
  };
  const c = config[method];
  if (!c) return <Badge variant="secondary">{method}</Badge>;
  return (
    <Badge className={c.className}>
      <span className="mr-1">{c.icon}</span>
      {c.label}
    </Badge>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  // ── Filter State ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // ── Detail Dialog State ─────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── Filters Open ────────────────────────────────────────────────────────────
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Transactions Query ──────────────────────────────────────────────────────
  const transactionsQuery = useQuery<PaginatedResponse<Transaction>>({
    queryKey: ['transactions', page, perPage, search, status, paymentMethod, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
      });
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      if (paymentMethod && paymentMethod !== 'all') params.set('paymentMethod', paymentMethod);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat transaksi');
      return res.json();
    },
  });

  // ── Detail Query ────────────────────────────────────────────────────────────
  const detailQuery = useQuery<Transaction>({
    queryKey: ['transaction-detail', detailId],
    queryFn: async () => {
      if (!detailId) throw new Error('No ID');
      const res = await fetch(`/api/transactions/${detailId}`);
      if (!res.ok) throw new Error('Gagal memuat detail transaksi');
      const json = await res.json();
      return json.data as Transaction;
    },
    enabled: !!detailId,
  });

  // ── Derived Data ────────────────────────────────────────────────────────────
  const transactions = transactionsQuery.data?.data ?? [];
  const totalTransactions = transactionsQuery.data?.total ?? 0;
  const totalPages = transactionsQuery.data?.totalPages ?? 1;
  const isLoading = transactionsQuery.isLoading || transactionsQuery.isFetching;
  const detailData = detailQuery.data;

  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, totalTransactions);

  const hasActiveFilters = !!(status !== 'all' || paymentMethod !== 'all' || startDate || endDate);

  const clearFilters = useCallback(() => {
    setStatus('all');
    setPaymentMethod('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

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

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handlePaymentMethodChange = useCallback((value: string) => {
    setPaymentMethod(value);
    setPage(1);
  }, []);

  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value);
    setPage(1);
  }, []);

  const handleEndDateChange = useCallback((value: string) => {
    setEndDate(value);
    setPage(1);
  }, []);

  // ── Table Columns ─────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Transaction>[]>(
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
        size: 160,
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.invoiceNumber}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Tanggal',
        size: 160,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: 'customer',
        header: 'Pelanggan',
        size: 140,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.customer?.name || '-'}</span>
        ),
      },
      {
        accessorKey: 'user',
        header: 'Kasir',
        size: 130,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.original.user?.name || '-'}</span>
        ),
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Metode Bayar',
        size: 120,
        cell: ({ row }) => getPaymentBadge(row.original.paymentMethod),
      },
      {
        accessorKey: 'grandTotal',
        header: 'Total',
        size: 140,
        cell: ({ row }) => (
          <span className="font-medium text-sm">{formatRupiah(row.original.grandTotal)}</span>
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
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: { pageIndex: page - 1, pageSize: perPage },
    },
  });

  // ── Detail Dialog Content ──────────────────────────────────────────────────

  const detailContent = (
    <div className="space-y-6">
      {detailQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : detailData ? (
        <>
          {/* Transaction Info */}
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
              <Label className="text-muted-foreground text-xs">Pelanggan</Label>
              <p className="text-sm">{detailData.customer?.name || 'Umum'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Kasir</Label>
              <p className="text-sm">{detailData.user?.name || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Metode Pembayaran</Label>
              <div className="mt-0.5">{getPaymentBadge(detailData.paymentMethod)}</div>
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
            <h4 className="font-semibold text-sm mb-3">Item Transaksi</h4>
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Diskon</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detailData.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        Tidak ada item
                      </TableCell>
                    </TableRow>
                  ) : (
                    (detailData.items ?? []).map((item: TransactionItem, idx: number) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{formatRupiah(item.price)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {item.discount > 0 ? formatRupiah(item.discount) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatRupiah(item.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <Separator />

          {/* Payment Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm mb-3">Detail Pembayaran</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatRupiah(detailData.subtotal)}</span>
              </div>
              {detailData.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon</span>
                  <span>-{formatRupiah(detailData.discountAmount)}</span>
                </div>
              )}
              {detailData.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pajak</span>
                  <span>{formatRupiah(detailData.taxAmount)}</span>
                </div>
              )}
              {detailData.serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Biaya Layanan</span>
                  <span>{formatRupiah(detailData.serviceCharge)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Grand Total</span>
                <span>{formatRupiah(detailData.grandTotal)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dibayar</span>
                <span>{formatRupiah(detailData.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kembalian</span>
                <span>{formatRupiah(detailData.changeAmount)}</span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

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
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Transaksi</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lihat semua riwayat transaksi toko Anda
          </p>
        </div>
        <Button
          variant={hasActiveFilters ? 'default' : 'outline'}
          onClick={() => setFiltersOpen((v) => !v)}
          className={hasActiveFilters ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          <Filter className="size-4" />
          Filter
          {hasActiveFilters && (
            <span className="ml-1 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
              {[status !== 'all', paymentMethod !== 'all', !!startDate, !!endDate].filter(Boolean).length}
            </span>
          )}
        </Button>
      </motion.div>

      {/* ── Filters Panel ──────────────────────────────────────────────────── */}
      {filtersOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border rounded-xl bg-card shadow-sm p-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  <SelectItem value="held">Ditahan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Metode Bayar</Label>
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Metode</SelectItem>
                  <SelectItem value="tunai">Tunai</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="kredit">Kredit</SelectItem>
                  <SelectItem value="e-wallet">E-Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tanggal Mulai</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tanggal Akhir</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive">
                <X className="size-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </motion.div>
      )}

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
                    <TableCell><Skeleton className="h-4 w-[130px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[90px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[110px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[80px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="size-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">
                        {search || hasActiveFilters
                          ? 'Tidak ada transaksi yang sesuai dengan filter'
                          : 'Belum ada riwayat transaksi.'}
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
        {totalTransactions > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                Menampilkan {startItem}-{endItem} dari {totalTransactions}
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

      {/* ── Detail Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={closeDetail}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>
              Rincian lengkap transaksi {detailData?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {detailContent}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

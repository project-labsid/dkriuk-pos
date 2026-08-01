'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  BarChart as BarChartIcon,
  TrendingUp,
  Users,
  Package,
  Loader2,
  CalendarDays,
  DollarSign,
  ShoppingCart,
  Target,
  Activity,
  Download,
  Printer,
  FileText,
} from 'lucide-react';
import { cn, formatRupiah } from '@/lib/utils';
import { exportToExcel, printReport, printThermal } from '@/lib/report-export';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  BarChart,
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDefaultDates() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };
}

// ─── Date Range Filter ────────────────────────────────────────────────────────

function DateRangeFilter({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  const defaults = getDefaultDates();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-auto">
        <Label className="text-xs text-muted-foreground">Tanggal Mulai</Label>
        <div className="relative mt-1">
          <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="pl-9"
      />
    </div>
  </div>
  <div className="w-full sm:w-auto">
    <Label className="text-xs text-muted-foreground">Tanggal Akhir</Label>
    <div className="relative mt-1">
      <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="pl-9"
      />
    </div>
  </div>
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      const today = new Date().toISOString().split('T')[0];
      onStartChange(today);
      onEndChange(today);
    }}
  >
    Hari Ini
  </Button>
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      onStartChange(defaults.start);
      onEndChange(defaults.end);
    }}
  >
    Bulan Ini
  </Button>
</div>
  );
}

// ─── Chart Configs ─────────────────────────────────────────────────────────────

const salesChartConfig = {
  pendapatan: { label: 'Pendapatan', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const bestSellingChartConfig = {
  terjual: { label: 'Qty Terjual', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const profitLossChartConfig = {
  laba: { label: 'Laba', color: 'hsl(var(--chart-1))' },
  hpp: { label: 'HPP', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

const dailyTrafficChartConfig = {
  transaksi: { label: 'Transaksi', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const monthlyTrafficChartConfig = {
  transaksi: { label: 'Transaksi', color: 'hsl(var(--chart-2))' },
  pendapatan: { label: 'Pendapatan', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

// ─── Shared Export Buttons ───────────────────────────────────────────────────

function ExportButtons({ onExcel, onPrintA4, onPrintThermal }: {
  onExcel: () => void;
  onPrintA4: () => void;
  onPrintThermal: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onExcel}>
        <Download className="mr-1.5 h-4 w-4" />
        Download Excel
      </Button>
      <Button variant="outline" size="sm" onClick={onPrintA4}>
        <Printer className="mr-1.5 h-4 w-4" />
        Print A4
      </Button>
      <Button variant="outline" size="sm" onClick={onPrintThermal}>
        <FileText className="mr-1.5 h-4 w-4" />
        Print Thermal
      </Button>
    </div>
  );
}

const STORE_NAME = 'POS Toko';

// ─── Penjualan Tab ─────────────────────────────────────────────────────────────

function PenjualanTab() {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-daily', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'daily' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Gagal memuat laporan');
      const json = await res.json();
      return json.data;
    },
  });

  // Group transactions by date for chart & table
  const dailyData = useMemo(() => {
    if (!data?.transactions) return [];
    const grouped: Record<string, { date: string; transactions: number; revenue: number }> = {};
    for (const tx of data.transactions) {
      const day = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!grouped[day]) grouped[day] = { date: day, transactions: 0, revenue: 0 };
      grouped[day].transactions += 1;
      grouped[day].revenue += tx.grandTotal;
    }
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const summary = data?.summary;
  const avgPerTransaction = summary ? (summary.totalSales / (summary.totalTransactions || 1)) : 0;

  const getExportData = useCallback(() => {
    const columns = ['Tanggal', 'Jumlah Transaksi', 'Total Pendapatan'];
    const rows = dailyData.map((d) => [
      formatDate(d.date),
      d.transactions,
      formatRupiah(d.revenue),
    ]);
    const summaryObj = summary
      ? {
          'Total Transaksi': String(summary.totalTransactions ?? 0),
          'Total Pendapatan': formatRupiah(summary.totalSales ?? 0),
          'Rata-rata / Transaksi': formatRupiah(avgPerTransaction),
        }
      : undefined;
    return { title: 'Laporan Penjualan', subtitle: `${formatDate(startDate)} – ${formatDate(endDate)}`, columns, rows, summary: summaryObj };
  }, [dailyData, summary, avgPerTransaction, startDate, endDate]);

  const handleExcel = useCallback(() => {
    const { title, columns, rows } = getExportData();
    exportToExcel({ sheetName: title, columns, rows });
  }, [getExportData]);

  const handlePrintA4 = useCallback(() => {
    const { title, subtitle, columns, rows, summary } = getExportData();
    printReport({ title, subtitle, columns, rows, summary });
  }, [getExportData]);

  const handlePrintThermal = useCallback(() => {
    const { title, columns, rows, summary } = getExportData();
    printThermal({ storeName: STORE_NAME, title, columns, rows, summary });
  }, [getExportData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </CardContent>
      </Card>

      <ExportButtons onExcel={handleExcel} onPrintA4={handlePrintA4} onPrintThermal={handlePrintThermal} />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold">
                    {summary?.totalTransactions ?? 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-28" />
                ) : (
                  <p className="text-2xl font-bold">
                    {formatRupiah(summary?.totalSales ?? 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rata-rata / Transaksi</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-2xl font-bold">
                    {formatRupiah(avgPerTransaction)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Grafik Pendapatan Harian</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : !dailyData.length ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              {isError ? 'Gagal memuat data' : 'Tidak ada data penjualan'}
            </div>
          ) : (
            <ChartContainer config={salesChartConfig} className="h-[300px] w-full">
              <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  fontSize={12}
                />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatRupiah(value as number)}
                      labelFormatter={(label) => formatDate(label as string)}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-pendapatan)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Daily Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rincian Harian</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-background z-10">
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Jumlah Transaksi</TableHead>
                  <TableHead className="text-right">Total Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : !dailyData.length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  dailyData.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="text-right font-mono">{row.transactions}</TableCell>
                      <TableCell className="text-right font-mono">{formatRupiah(row.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Produk Terlaris Tab ──────────────────────────────────────────────────────

function ProdukTerlarisTab() {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-best-selling', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'best_selling' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Gagal memuat data');
      const json = await res.json();
      return json.data;
    },
  });

  const top10 = useMemo(() => {
    if (!data?.topProducts) return [];
    return data.topProducts.slice(0, 10);
  }, [data]);

  const chartData = useMemo(() => {
    return [...top10].reverse().map((p) => ({
      name: p.productName.length > 20 ? p.productName.slice(0, 20) + '...' : p.productName,
      fullName: p.productName,
      terjual: p.totalQuantity,
      revenue: p.totalRevenue,
    }));
  }, [top10]);

  const getExportData = useCallback(() => {
    const columns = ['Peringkat', 'Nama Produk', 'Qty Terjual', 'Pendapatan'];
    const rows = top10.map((p, idx) => [
      `#${idx + 1}`,
      p.productName,
      p.totalQuantity,
      formatRupiah(p.totalRevenue),
    ]);
    return { title: 'Produk Terlaris', subtitle: `${formatDate(startDate)} – ${formatDate(endDate)}`, columns, rows };
  }, [top10, startDate, endDate]);

  const handleExcel = useCallback(() => {
    const { title, columns, rows } = getExportData();
    exportToExcel({ sheetName: title, columns, rows });
  }, [getExportData]);

  const handlePrintA4 = useCallback(() => {
    const { title, subtitle, columns, rows } = getExportData();
    printReport({ title, subtitle, columns, rows });
  }, [getExportData]);

  const handlePrintThermal = useCallback(() => {
    const { title, columns, rows } = getExportData();
    printThermal({ storeName: STORE_NAME, title, columns, rows });
  }, [getExportData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </CardContent>
      </Card>

      <ExportButtons onExcel={handleExcel} onPrintA4={handlePrintA4} onPrintThermal={handlePrintThermal} />

      {/* Horizontal Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 10 Produk Terlaris</CardTitle>
          <CardDescription>Berdasarkan jumlah terjual</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : !top10.length ? (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              {isError ? 'Gagal memuat data' : 'Tidak ada data penjualan'}
            </div>
          ) : (
            <ChartContainer config={bestSellingChartConfig} className="h-[400px] w-full">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  fontSize={11}
                  tickLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => {
                        const payload = item.payload as { fullName?: string; terjual?: number; revenue?: number };
                        return `${payload.terjual?.toLocaleString()} unit · ${formatRupiah(payload.revenue ?? 0)}`;
                      }}
                      labelFormatter={(_label, payload) => {
                        const item = payload?.[0]?.payload as { fullName?: string };
                        return item?.fullName || '';
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="terjual"
                  fill="var(--color-terjual)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detail Produk Terlaris</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-background z-10">
                  <TableHead className="w-12">Peringkat</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : !top10.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  top10.map((p, idx) => (
                    <TableRow key={p.productId}>
                      <TableCell>
                        <Badge variant={idx < 3 ? 'default' : 'secondary'} className="font-mono">
                          #{idx + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{p.productName}</TableCell>
                      <TableCell className="text-right font-mono">{p.totalQuantity}</TableCell>
                      <TableCell className="text-right font-mono">{formatRupiah(p.totalRevenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Laba Rugi Tab ─────────────────────────────────────────────────────────────

function LabaRugiTab() {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-profit-loss', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'profit_loss' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Gagal memuat data');
      const json = await res.json();
      return json.data;
    },
  });

  // Also fetch daily data for chart
  const { data: dailyData } = useQuery({
    queryKey: ['report-daily-pl', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'daily' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
  });

  const chartDailyData = useMemo(() => {
    if (!dailyData?.transactions) return [];
    const grouped: Record<string, { date: string; laba: number; hpp: number }> = {};
    for (const tx of dailyData.transactions) {
      const day = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!grouped[day]) grouped[day] = { date: day, laba: 0, hpp: 0 };
      const cost = tx.items?.reduce((s: number, item: { costPrice: number; quantity: number }) => s + item.costPrice * item.quantity, 0) ?? 0;
      grouped[day].laba += tx.grandTotal - cost;
      grouped[day].hpp += cost;
    }
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyData]);

  const margin = data?.revenue ? ((data.grossProfit / data.revenue) * 100) : 0;

  const getExportData = useCallback(() => {
    const columns = ['Tanggal', 'Laba', 'HPP'];
    const rows = chartDailyData.map((d) => [
      formatDate(d.date),
      formatRupiah(d.laba),
      formatRupiah(d.hpp),
    ]);
    const summaryObj = data
      ? {
          'Total Pendapatan': formatRupiah(data.revenue ?? 0),
          'Total HPP': formatRupiah(data.costOfGoodsSold ?? 0),
          'Laba Kotor': formatRupiah(data.grossProfit ?? 0),
          'Margin': `${margin.toFixed(1)}%`,
        }
      : undefined;
    return { title: 'Laporan Laba Rugi', subtitle: `${formatDate(startDate)} – ${formatDate(endDate)}`, columns, rows, summary: summaryObj };
  }, [chartDailyData, data, margin, startDate, endDate]);

  const handleExcel = useCallback(() => {
    const { title, columns, rows } = getExportData();
    exportToExcel({ sheetName: title, columns, rows });
  }, [getExportData]);

  const handlePrintA4 = useCallback(() => {
    const { title, subtitle, columns, rows, summary } = getExportData();
    printReport({ title, subtitle, columns, rows, summary });
  }, [getExportData]);

  const handlePrintThermal = useCallback(() => {
    const { title, columns, rows, summary } = getExportData();
    printThermal({ storeName: STORE_NAME, title, columns, rows, summary });
  }, [getExportData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </CardContent>
      </Card>

      <ExportButtons onExcel={handleExcel} onPrintA4={handlePrintA4} onPrintThermal={handlePrintThermal} />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pendapatan</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-6 w-28" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-emerald-600">{formatRupiah(data?.revenue ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total HPP</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-6 w-28" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-red-600">{formatRupiah(data?.costOfGoodsSold ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Laba Kotor</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-6 w-28" />
            ) : (
              <p className={cn(
                'mt-1 text-2xl font-bold',
                (data?.grossProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {formatRupiah(data?.grossProfit ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Margin</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-6 w-16" />
            ) : (
              <p className={cn(
                'mt-1 text-2xl font-bold',
                margin >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {margin.toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart: Profit vs Cost */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Grafik Laba vs HPP Harian</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : !chartDailyData.length ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              {isError ? 'Gagal memuat data' : 'Tidak ada data'}
            </div>
          ) : (
            <ChartContainer config={profitLossChartConfig} className="h-[300px] w-full">
              <BarChart data={chartDailyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  fontSize={12}
                />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatRupiah(value as number)}
                      labelFormatter={(label) => formatDate(label as string)}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="laba" fill="var(--color-laba)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hpp" fill="var(--color-hpp)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Pelanggan Tab ─────────────────────────────────────────────────────────────

function PelangganTab() {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-customer', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'customer' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Gagal memuat data');
      const json = await res.json();
      return json.data;
    },
  });

  // Also fetch all customers to get member points
  const { data: allCustomers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res = await fetch('/api/customers?perPage=100');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data;
    },
  });

  const customerMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of allCustomers ?? []) {
      map[c.id] = c.memberPoint;
    }
    return map;
  }, [allCustomers]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Laporan Pelanggan</CardTitle>
          <CardDescription>Pelanggan dengan transaksi terbanyak</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-background z-10">
                  <TableHead>No</TableHead>
                  <TableHead>Nama Pelanggan</TableHead>
                  <TableHead className="text-right">Total Transaksi</TableHead>
                  <TableHead className="text-right">Total Belanja</TableHead>
                  <TableHead className="text-right">Poin Member</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : isError || !data?.customers?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {isError ? 'Gagal memuat data' : 'Tidak ada data pelanggan'}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.customers.map((c: { customerId: string; customerName: string; totalSpent: number; transactionCount: number }, idx: number) => (
                    <TableRow key={c.customerId}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{c.customerName}</TableCell>
                      <TableCell className="text-right font-mono">{c.transactionCount}</TableCell>
                      <TableCell className="text-right font-mono">{formatRupiah(c.totalSpent)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{customerMap[c.customerId] ?? 0}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stok Tab ──────────────────────────────────────────────────────────────────

function StokTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-stock'],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'stock' });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Gagal memuat data');
      const json = await res.json();
      return json.data;
    },
  });

  const products = data?.products ?? [];
  const lowStock = data?.lowStockProducts ?? [];
  const outOfStock = products.filter((p: { stock: number }) => p.stock === 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Produk</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{data?.totalProducts ?? 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stok Rendah</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600">{lowStock.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2.5">
                <Package className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stok Habis</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-red-600">{outOfStock.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Status Stok Produk</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-background z-10">
                  <TableHead>Nama Produk</TableHead>
                  <TableHead className="text-right">Stok Saat Ini</TableHead>
                  <TableHead className="text-right">Min. Stok</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : isError || !products.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {isError ? 'Gagal memuat data' : 'Tidak ada produk'}
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p: { id: string; name: string; stock: number; minStock: number }, idx: number) => {
                    let status: { label: string; color: string };
                    if (p.stock === 0) {
                      status = { label: 'Habis', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
                    } else if (p.stock <= p.minStock) {
                      status = { label: 'Rendah', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
                    } else {
                      status = { label: 'Aman', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
                    }
                    return (
                      <TableRow key={p.id || idx}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{p.stock}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{p.minStock}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(status.color)}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Traffic Tab ──────────────────────────────────────────────────────────

function TrafficTab() {
  // Daily traffic: transactions per hour today
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['traffic-daily', todayStr],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'daily', startDate: todayStr, endDate: todayStr });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 30000, // auto-refresh every 30s
  });

  // Monthly traffic: transactions per day this month
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['traffic-monthly', monthStart, todayStr],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'daily', startDate: monthStart, endDate: todayStr });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 60000, // auto-refresh every 60s
  });

  // Process hourly data for today
  const hourlyData = useMemo(() => {
    const hours: { hour: string; label: string; transaksi: number }[] = [];
    const currentHour = now.getHours();

    // Initialize all hours from opening (6am) to current hour
    for (let h = 6; h <= Math.min(currentHour, 23); h++) {
      hours.push({
        hour: String(h),
        label: `${String(h).padStart(2, '0')}:00`,
        transaksi: 0,
      });
    }

    if (dailyData?.transactions) {
      for (const tx of dailyData.transactions) {
        const txDate = new Date(tx.createdAt);
        const h = txDate.getHours();
        const found = hours.find(item => item.hour === String(h));
        if (found) {
          found.transaksi += 1;
        }
      }
    }

    return hours;
  }, [dailyData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process daily data for this month
  const dailyMonthlyData = useMemo(() => {
    const days: { date: string; label: string; transaksi: number; pendapatan: number }[] = [];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    for (let d = 1; d <= Math.min(daysInMonth, now.getDate()); d++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        label: `${d}`,
        transaksi: 0,
        pendapatan: 0,
      });
    }

    if (monthlyData?.transactions) {
      for (const tx of monthlyData.transactions) {
        const day = new Date(tx.createdAt).getDate();
        const found = days.find(item => parseInt(item.label) === day);
        if (found) {
          found.transaksi += 1;
          found.pendapatan += tx.grandTotal;
        }
      }
    }

    return days;
  }, [monthlyData]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayTotalTx = dailyData?.summary?.totalTransactions ?? 0;
  const todayTotalRevenue = dailyData?.summary?.totalSales ?? 0;
  const monthTotalTx = monthlyData?.summary?.totalTransactions ?? 0;
  const monthTotalRevenue = monthlyData?.summary?.totalSales ?? 0;
  const peakHour = useMemo(() => {
    if (!hourlyData.length) return '-';
    const peak = hourlyData.reduce((max, h) => h.transaksi > max.transaksi ? h : max, hourlyData[0]);
    return peak.transaksi > 0 ? peak.label : '-';
  }, [hourlyData]);

  const monthLabel = useMemo(() => now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), []);

  const getExportData = useCallback(() => {
    const columns = ['Tanggal', 'Transaksi', 'Pendapatan'];
    const rows = dailyMonthlyData
      .filter((d) => d.transaksi > 0)
      .map((d) => [formatDate(d.date), d.transaksi, formatRupiah(d.pendapatan)]);
    const summaryObj = {
      'Transaksi Hari Ini': String(todayTotalTx),
      'Pendapatan Hari Ini': formatRupiah(todayTotalRevenue),
      'Jam Tersibuk': peakHour,
      'Transaksi Bulan Ini': String(monthTotalTx),
      'Pendapatan Bulan Ini': formatRupiah(monthTotalRevenue),
    };
    return { title: 'Traffic Report', subtitle: 'Bulan ' + monthLabel, columns, rows, summary: summaryObj };
  }, [dailyMonthlyData, todayTotalTx, todayTotalRevenue, peakHour, monthTotalTx, monthTotalRevenue, monthLabel]);

  const handleExcel = useCallback(() => {
    const { title, columns, rows } = getExportData();
    exportToExcel({ sheetName: title, columns, rows });
  }, [getExportData]);

  const handlePrintA4 = useCallback(() => {
    const { title, subtitle, columns, rows, summary } = getExportData();
    printReport({ title, subtitle, columns, rows, summary });
  }, [getExportData]);

  const handlePrintThermal = useCallback(() => {
    const { title, columns, rows, summary } = getExportData();
    printThermal({ storeName: STORE_NAME, title, columns, rows, summary });
  }, [getExportData]);

  return (
    <div className="space-y-4">
      <ExportButtons onExcel={handleExcel} onPrintA4={handlePrintA4} onPrintThermal={handlePrintThermal} />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transaksi Hari Ini</p>
                {dailyLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{todayTotalTx}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendapatan Hari Ini</p>
                {dailyLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-lg font-bold text-emerald-600">{formatRupiah(todayTotalRevenue)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jam Tersibuk</p>
                {dailyLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600">{peakHour}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transaksi Bulan Ini</p>
                {monthlyLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{monthTotalTx}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Traffic Chart - Per Hour Today */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Traffic Harian</CardTitle>
              <CardDescription className="text-xs">Transaksi per jam hari ini (reset setiap tengah malam)</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : !hourlyData.some(h => h.transaksi > 0) ? (
            <div className="flex h-[250px] flex-col items-center justify-center text-muted-foreground">
              <Activity className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Belum ada transaksi hari ini</p>
            </div>
          ) : (
            <ChartContainer config={dailyTrafficChartConfig} className="h-[250px] w-full">
              <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  fontSize={11}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(hourlyData.length / 8) - 1)}
                />
                <YAxis fontSize={11} allowDecimals={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${value} transaksi`}
                    />
                  }
                />
                <Bar
                  dataKey="transaksi"
                  fill="var(--color-transaksi)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Traffic Chart - Per Day This Month */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Traffic Bulanan</CardTitle>
              <CardDescription className="text-xs">Transaksi per hari bulan ini (reset setiap tanggal 1)</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Bulan Ini</p>
              <p className="text-sm font-bold text-emerald-600">{formatRupiah(monthTotalRevenue)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monthlyLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : !dailyMonthlyData.some(d => d.transaksi > 0) ? (
            <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
              <Activity className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Belum ada transaksi bulan ini</p>
            </div>
          ) : (
            <ChartContainer config={monthlyTrafficChartConfig} className="h-[300px] w-full">
              <AreaChart data={dailyMonthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="fillTransaksi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-transaksi)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-transaksi)" stopOpacity={0.02}/>
                  </linearGradient>
                  <linearGradient id="fillPendapatan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-pendapatan)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-pendapatan)" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  fontSize={11}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(dailyMonthlyData.length / 15) - 1)}
                />
                <YAxis fontSize={11} yAxisId="left" allowDecimals={false} />
                <YAxis fontSize={11} yAxisId="right" orientation="right" tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === 'pendapatan') return formatRupiah(value as number);
                        return `${value} transaksi`;
                      }}
                      labelFormatter={(label) => {
                        const d = dailyMonthlyData.find(item => item.label === label);
                        return d ? formatDate(d.date) : String(label);
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar yAxisId="left" dataKey="transaksi" fill="var(--color-transaksi)" radius={[3, 3, 0, 0]} />
                <Area yAxisId="right" type="monotone" dataKey="pendapatan" stroke="var(--color-pendapatan)" strokeWidth={2} fill="url(#fillPendapatan)" />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Daily Table for This Month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detail Traffic Harian Bulan Ini</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-background z-10">
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Jumlah Transaksi</TableHead>
                  <TableHead className="text-right">Total Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : !dailyMonthlyData.filter(d => d.transaksi > 0).length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  dailyMonthlyData
                    .filter(d => d.transaksi > 0)
                    .reverse()
                    .map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="text-right font-mono">{row.transaksi}</TableCell>
                      <TableCell className="text-right font-mono">{formatRupiah(row.pendapatan)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="text-muted-foreground">Analisis penjualan, produk, dan stok</p>
      </div>

      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="traffic" className="flex-1 min-w-[80px]">
            <Activity className="mr-2 h-4 w-4" />
            Traffic
          </TabsTrigger>
          <TabsTrigger value="penjualan" className="flex-1 min-w-[100px]">
            <TrendingUp className="mr-2 h-4 w-4" />
            Penjualan
          </TabsTrigger>
          <TabsTrigger value="best-selling" className="flex-1 min-w-[100px]">
            <BarChartIcon className="mr-2 h-4 w-4" />
            Produk Terlaris
          </TabsTrigger>
          <TabsTrigger value="profit-loss" className="flex-1 min-w-[100px]">
            <DollarSign className="mr-2 h-4 w-4" />
            Laba Rugi
          </TabsTrigger>
          <TabsTrigger value="customer" className="flex-1 min-w-[100px]">
            <Users className="mr-2 h-4 w-4" />
            Pelanggan
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex-1 min-w-[100px]">
            <Package className="mr-2 h-4 w-4" />
            Stok
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="traffic">
            <motion.div
              key="traffic"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <TrafficTab />
            </motion.div>
          </TabsContent>
          <TabsContent value="penjualan">
            <motion.div
              key="penjualan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <PenjualanTab />
            </motion.div>
          </TabsContent>
          <TabsContent value="best-selling">
            <motion.div
              key="best-selling"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ProdukTerlarisTab />
            </motion.div>
          </TabsContent>
          <TabsContent value="profit-loss">
            <motion.div
              key="profit-loss"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <LabaRugiTab />
            </motion.div>
          </TabsContent>
          <TabsContent value="customer">
            <motion.div
              key="customer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <PelangganTab />
            </motion.div>
          </TabsContent>
          <TabsContent value="stock">
            <motion.div
              key="stock"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <StokTab />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

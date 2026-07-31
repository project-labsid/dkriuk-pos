'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  Loader2,
  CalendarDays,
  DollarSign,
  ShoppingCart,
  BarChart,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  ResponsiveContainer,
} from 'recharts';

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="text-muted-foreground">Analisis penjualan, produk, dan stok</p>
      </div>

      <Tabs defaultValue="penjualan" className="space-y-4">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="penjualan" className="flex-1 min-w-[100px]">
            <TrendingUp className="mr-2 h-4 w-4" />
            Penjualan
          </TabsTrigger>
          <TabsTrigger value="best-selling" className="flex-1 min-w-[100px]">
            <BarChart className="mr-2 h-4 w-4" />
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

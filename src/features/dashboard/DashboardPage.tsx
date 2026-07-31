'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Truck,
  Receipt,
  Wallet,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DashboardStats } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShortRupiah(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`;
  return amount.toString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Selesai</Badge>;
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Menunggu</Badge>;
    case 'held':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Ditahan</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Dibatalkan</Badge>;
    case 'refunded':
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">Refund</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function SalesTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{formatRupiah(payload[0].value)}</p>
    </div>
  );
}

function ProductTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { productName: string; quantity: number } }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as { productName: string; quantity: number; revenue: number };
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="text-sm font-semibold">{data.productName}</p>
      <p className="text-xs text-muted-foreground">Terjual: {data.quantity} pcs</p>
      <p className="text-xs text-muted-foreground">Pendapatan: {formatRupiah(data.revenue)}</p>
    </div>
  );
}

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── KPI Card Component ──────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend: number;
  trendLabel: string;
  iconBg: string;
  iconColor: string;
}) {
  const isPositive = trend >= 0;
  return (
    <motion.div variants={itemVariants}>
      <Card className="p-4 transition-shadow hover:shadow-md">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold tracking-tight truncate">{value}</p>
            <div className="mt-0.5 flex items-center gap-1">
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{trend}%
              </span>
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Mini Stat Card ──────────────────────────────────────────────────────────

function MiniStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="p-4 transition-shadow hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold truncate">{value}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then((r) => r.json()).then((j) => j.data),
    refetchInterval: 30_000,
  });

  const chartData = useMemo(() => {
    if (!data?.salesChartData) return [];
    return data.salesChartData.map((d) => ({
      ...d,
      date: formatDate(d.date),
    }));
  }, [data]);

  const topProductsData = useMemo(() => {
    if (!data?.topProducts) return [];
    return data.topProducts.map((p) => ({
      ...p,
      name: p.productName.length > 18 ? p.productName.slice(0, 18) + '…' : p.productName,
    }));
  }, [data]);

  // ── Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ListSkeleton />
          <ListSkeleton />
        </div>
      </div>
    );
  }

  // ── Error state
  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <p className="mt-3 text-lg font-medium">Gagal memuat data dashboard</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Terjadi kesalahan saat mengambil data. Silakan coba lagi.
        </p>
      </Card>
    );
  }

  const recentTx = data.recentTransactions?.slice(0, 5) ?? [];
  const lowStock = data.lowStockProducts ?? [];

  return (
    <motion.div
      className="space-y-6 p-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── KPI Cards Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Penjualan Hari Ini"
          value={formatRupiah(data.todaySales)}
          trend={12.5}
          trendLabel="vs kemarin"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="Penjualan Bulan Ini"
          value={formatRupiah(data.monthSales)}
          trend={8.2}
          trendLabel="vs bulan lalu"
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <KpiCard
          icon={Package}
          label="Total Produk"
          value={data.totalProducts.toLocaleString('id-ID')}
          trend={3.1}
          trendLabel="produk baru"
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
        />
        <KpiCard
          icon={Users}
          label="Total Pelanggan"
          value={data.totalCustomers.toLocaleString('id-ID')}
          trend={5.4}
          trendLabel="pelanggan baru"
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />
      </div>

      {/* ── Additional Stats Row ────────────────────────────────────────── */}
      <motion.div className="grid grid-cols-2 gap-4 sm:grid-cols-4" variants={itemVariants}>
        <MiniStatCard icon={Truck} label="Total Supplier" value={data.totalSuppliers} />
        <MiniStatCard icon={Receipt} label="Total Transaksi" value={data.totalTransactions.toLocaleString('id-ID')} />
        <MiniStatCard icon={Wallet} label="Pendapatan" value={formatShortRupiah(data.totalRevenue)} />
        <MiniStatCard icon={Building2} label="Cabang" value={2} />
      </motion.div>

      {/* ── Charts Section ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Area Chart — Sales Trend */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tren Penjualan 30 Hari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        interval={4}
                      />
                      <YAxis
                        tickFormatter={formatShortRupiah}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip content={<SalesTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#salesGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Belum ada data penjualan
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bar Chart — Top Products */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produk Terlaris</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {topProductsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProductsData}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        width={120}
                      />
                      <Tooltip content={<ProductTooltip />} />
                      <Bar
                        dataKey="quantity"
                        fill="#10b981"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Belum ada data produk
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Bottom Section ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Transactions */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Transaksi Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 px-2 pb-2">
              {recentTx.length > 0 ? (
                <ScrollArea className="max-h-96">
                  <div className="space-y-1 px-2">
                    {recentTx.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{tx.invoiceNumber}</p>
                            {getStatusBadge(tx.status)}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {tx.customer?.name ?? 'Pelanggan Umum'} · {formatTime(tx.createdAt)}
                          </p>
                        </div>
                        <p className="ml-3 shrink-0 text-sm font-semibold">
                          {formatRupiah(tx.grandTotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  Belum ada transaksi
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Stok Menipis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 px-2 pb-2">
              {lowStock.length > 0 ? (
                <ScrollArea className="max-h-96">
                  <div className="space-y-1 px-2">
                    {lowStock.map((product) => {
                      const isCritical = product.stock === 0;
                      const isLow = product.stock > 0 && product.stock <= product.minStock;
                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{product.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Stok: <span className="font-medium text-foreground">{product.stock}</span> / {product.minStock} {product.unit}
                            </p>
                          </div>
                          {isCritical ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 shrink-0 ml-3">
                              Habis
                            </Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 shrink-0 ml-3">
                              Menipis
                            </Badge>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  Semua stok aman
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

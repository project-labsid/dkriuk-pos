'use client';
import { useEffect, useState } from 'react';
import { useAuthStore, useNavStore, useSettingsStore } from '@/store';
import LoginPage from '@/features/auth/LoginPage';
import AppLayout from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldX } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { PageName, UserRole } from '@/types';
const DashboardPage = dynamic(() => import('@/features/dashboard/DashboardPage'), { loading: () => <PageSkeleton />, ssr: false });
const POSPage = dynamic(() => import('@/features/pos/POSPage'), { loading: () => <PageSkeleton />, ssr: false });
const ProductsPage = dynamic(() => import('@/features/products/ProductsPage'), { loading: () => <PageSkeleton />, ssr: false });
const CategoriesPage = dynamic(() => import('@/features/categories/CategoriesPage'), { loading: () => <PageSkeleton />, ssr: false });
const SuppliersPage = dynamic(() => import('@/features/suppliers/SuppliersPage'), { loading: () => <PageSkeleton />, ssr: false });
const CustomersPage = dynamic(() => import('@/features/customers/CustomersPage'), { loading: () => <PageSkeleton />, ssr: false });
const TransactionsPage = dynamic(() => import('@/features/transactions/TransactionsPage'), { loading: () => <PageSkeleton />, ssr: false });
const PurchasesPage = dynamic(() => import('@/features/purchases/PurchasesPage'), { loading: () => <PageSkeleton />, ssr: false });
const StockPage = dynamic(() => import('@/features/stock/StockPage'), { loading: () => <PageSkeleton />, ssr: false });
const ReportsPage = dynamic(() => import('@/features/reports/ReportsPage'), { loading: () => <PageSkeleton />, ssr: false });
const SettingsPage = dynamic(() => import('@/features/settings/SettingsPage'), { loading: () => <PageSkeleton />, ssr: false });
const BranchesPage = dynamic(() => import('@/features/branches/BranchesPage'), { loading: () => <PageSkeleton />, ssr: false });
const UsersPage = dynamic(() => import('@/features/users/UsersPage'), { loading: () => <PageSkeleton />, ssr: false });
const pageAccess = {
  'dashboard': ['super_admin', 'admin'], 'pos': ['super_admin', 'admin', 'cashir'],
  'products': ['super_admin', 'admin'], 'categories': ['super_admin', 'admin'],
  'suppliers': ['super_admin', 'admin'], 'customers': ['super_admin', 'admin'],
  'transactions': ['super_admin', 'admin', 'cashir'], 'purchases': ['super_admin', 'admin'],
  'stock': ['super_admin', 'admin'], 'reports': ['super_admin', 'admin'],
  'settings': ['super_admin', 'admin'], 'tax-settings': ['super_admin', 'admin'],
  'branches': ['super_admin'], 'users': ['super_admin'],
} as const;
const defaultPageForRole = { 'super_admin': 'dashboard', 'admin': 'dashboard', 'cashir': 'pos' } as const;
function PageSkeleton() {
  return (<div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div><Skeleton className="h-80 rounded-xl" /></div>);
}
function AccessDenied() {
  return (<div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"><div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4"><ShieldX className="w-8 h-8 text-destructive" /></div><h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2><p className="text-muted-foreground max-w-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p></div>);
}
export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const { currentPage, setCurrentPage } = useNavStore();
  const { setStoreSettings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('pos_user');
    if (saved) { try { useAuthStore.getState().login(JSON.parse(saved)); } catch { localStorage.removeItem('pos_user'); } }
    queueMicrotask(() => setMounted(true));
  }, []);
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => { try { const r = await fetch('/api/settings'); if (r.ok && !cancelled) { const j = await r.json(); setStoreSettings(j.data || j); } } catch {} })();
    return () => { cancelled = true; };
  }, [isAuthenticated, setStoreSettings]);
  useEffect(() => { if (!user || !mounted) return; const allowed = pageAccess[currentPage as keyof typeof pageAccess]; if (allowed && !allowed.includes(user.role as any)) setCurrentPage(defaultPageForRole[user.role as keyof typeof defaultPageForRole] || 'pos'); }, [user, mounted, currentPage, setCurrentPage]);
  if (!mounted) return (<div className="min-h-screen flex items-center justify-center"><div className="space-y-4 w-80"><Skeleton className="h-12 w-12 rounded-xl mx-auto" /><Skeleton className="h-8 w-48 mx-auto" /><Skeleton className="h-4 w-32 mx-auto" /></div></div>);
  if (!isAuthenticated || !user) return <LoginPage />;
  const allowed = pageAccess[currentPage as keyof typeof pageAccess];
  const hasAccess = allowed && allowed.includes(user.role as any);
  return (<AppLayout>{hasAccess ? <PageContent page={currentPage} /> : <AccessDenied />}</AppLayout>);
}
function PageContent({ page }: { page: PageName }) {
  switch (page) {
    case 'pos': return <POSPage />; case 'products': return <ProductsPage />; case 'categories': return <CategoriesPage />;
    case 'suppliers': return <SuppliersPage />; case 'customers': return <CustomersPage />; case 'transactions': return <TransactionsPage />;
    case 'purchases': return <PurchasesPage />; case 'stock': return <StockPage />; case 'reports': return <ReportsPage />;
    case 'settings': case 'tax-settings': return <SettingsPage />; case 'branches': return <BranchesPage />;
    case 'users': return <UsersPage />; default: return <DashboardPage />;
  }
}

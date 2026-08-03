'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useNavStore, useSettingsStore } from '@/store';
import LoginPage from '@/features/auth/LoginPage';
import AppLayout from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldX } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { PageName, UserRole } from '@/types';

// Dynamic imports for code splitting
const DashboardPage = dynamic(() => import('@/features/dashboard/DashboardPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const POSPage = dynamic(() => import('@/features/pos/POSPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const ProductsPage = dynamic(() => import('@/features/products/ProductsPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const CategoriesPage = dynamic(() => import('@/features/categories/CategoriesPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const SuppliersPage = dynamic(() => import('@/features/suppliers/SuppliersPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const CustomersPage = dynamic(() => import('@/features/customers/CustomersPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const TransactionsPage = dynamic(() => import('@/features/transactions/TransactionsPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const PurchasesPage = dynamic(() => import('@/features/purchases/PurchasesPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const StockPage = dynamic(() => import('@/features/stock/StockPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const ReportsPage = dynamic(() => import('@/features/reports/ReportsPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const SettingsPage = dynamic(() => import('@/features/settings/SettingsPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const BranchesPage = dynamic(() => import('@/features/branches/BranchesPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});
const UsersPage = dynamic(() => import('@/features/users/UsersPage'), {
  loading: () => <PageSkeleton />,
  ssr: false,
});

// Role-based page access control
const pageAccess: Record<PageName, UserRole[]> = {
  'dashboard':    ['super_admin', 'admin'],
  'pos':          ['super_admin', 'admin', 'cashir'],
  'products':     ['super_admin', 'admin'],
  'categories':   ['super_admin', 'admin'],
  'suppliers':    ['super_admin', 'admin'],
  'customers':    ['super_admin', 'admin'],
  'transactions': ['super_admin', 'admin', 'cashir'],
  'purchases':    ['super_admin', 'admin'],
  'stock':        ['super_admin', 'admin'],
  'reports':      ['super_admin', 'admin'],
  'settings':     ['super_admin', 'admin'],
  'tax-settings': ['super_admin', 'admin'],
  'branches':     ['super_admin'],
  'users':        ['super_admin'],
};

// Default page for each role when redirected
const defaultPageForRole: Record<UserRole, PageName> = {
  'super_admin': 'dashboard',
  'admin': 'dashboard',
  'cashir': 'pos',
};

function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
      <p className="text-muted-foreground max-w-sm">
        Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi administrator untuk informasi lebih lanjut.
      </p>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const { currentPage, setCurrentPage } = useNavStore();
  const { setStoreSettings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  // Hydrate auth from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pos_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        useAuthStore.getState().login(parsed);
      } catch {
        localStorage.removeItem('pos_user');
      }
    }
    // Use microtask to avoid synchronous setState warning
    queueMicrotask(() => setMounted(true));
  }, []);

  // Load settings once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok && !cancelled) {
          const json = await res.json();
          const settingsMap = json.data || json;
          setStoreSettings(settingsMap);
        }
      } catch {
        // ignore
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, [isAuthenticated, setStoreSettings]);

  // Role-based page protection: redirect if user doesn't have access
  useEffect(() => {
    if (!user || !mounted) return;
    const role = user.role as UserRole;
    const allowed = pageAccess[currentPage];
    if (allowed && !allowed.includes(role)) {
      setCurrentPage(defaultPageForRole[role] || 'pos');
    }
  }, [user, mounted, currentPage, setCurrentPage]);

  // Show nothing during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-80">
          <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // Check page access
  const role = user.role as UserRole;
  const allowed = pageAccess[currentPage];
  const hasAccess = allowed && allowed.includes(role);

  // Render the app layout with the correct page
  return (
    <AppLayout>
      {hasAccess ? (
        <PageContent page={currentPage} />
      ) : (
        <AccessDenied />
      )}
    </AppLayout>
  );
}

function PageContent({ page }: { page: PageName }) {
  switch (page) {
    case 'dashboard':
      return <DashboardPage />;
    case 'pos':
      return <POSPage />;
    case 'products':
      return <ProductsPage />;
    case 'categories':
      return <CategoriesPage />;
    case 'suppliers':
      return <SuppliersPage />;
    case 'customers':
      return <CustomersPage />;
    case 'transactions':
      return <TransactionsPage />;
    case 'purchases':
      return <PurchasesPage />;
    case 'stock':
      return <StockPage />;
    case 'reports':
      return <ReportsPage />;
    case 'settings':
    case 'tax-settings':
      return <SettingsPage />;
    case 'branches':
      return <BranchesPage />;
    case 'users':
      return <UsersPage />;
    default:
      return <DashboardPage />;
  }
}

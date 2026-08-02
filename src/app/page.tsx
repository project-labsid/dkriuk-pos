'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useNavStore, useSettingsStore } from '@/store';
import LoginPage from '@/features/auth/LoginPage';
import AppLayout from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import type { PageName } from '@/types';

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

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const { currentPage } = useNavStore();
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

  // Render the app layout with the correct page
  return (
    <AppLayout>
      <PageContent page={currentPage} />
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

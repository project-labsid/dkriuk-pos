'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search,
  ScanBarcode,
  Package,
  Trash2,
  Pause,
  Play,
  X,
  Minus,
  Plus,
  Pencil,
  ShoppingCart,
  Banknote,
  QrCode,
  ArrowLeftRight,
  CreditCard,
  Smartphone,
  CheckCircle2,
  CircleDollarSign,

  StickyNote,
  User,
  ChevronDown,
  AlertTriangle,
  Loader2,
  Printer,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCartStore, useSettingsStore, useAuthStore } from '@/store';
import type { Product, Category, Customer, CartItem, PaymentSplit, Transaction } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}



// ─── Payment Methods ──────────────────────────────────────────────────────────

interface PaymentMethodOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: 'cash', label: 'Tunai', icon: <Banknote className="size-5" /> },
  { value: 'qris', label: 'QRIS', icon: <QrCode className="size-5" /> },
  { value: 'transfer', label: 'Transfer', icon: <ArrowLeftRight className="size-5" /> },
  { value: 'debit', label: 'Debit', icon: <CreditCard className="size-5" /> },
  { value: 'credit', label: 'Kredit', icon: <CreditCard className="size-5" /> },
  { value: 'ewallet', label: 'E-Wallet', icon: <Smartphone className="size-5" /> },
];

const QUICK_CASH_AMOUNTS = [50000, 100000, 200000, 500000];

// ─── Color palette for product image placeholders ─────────────────────────────

const PRODUCT_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
];

function getProductColor(index: number): string {
  return PRODUCT_COLORS[index % PRODUCT_COLORS.length];
}

// ─── Framer Motion Variants ───────────────────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

const cartItemVariants = {
  initial: { opacity: 0, x: 20, height: 0 },
  animate: { opacity: 1, x: 0, height: 'auto' },
  exit: { opacity: 0, x: -20, height: 0 },
  transition: { duration: 0.25 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function POSPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Cart store
  const items = useCartStore((s) => s.items);
  const cartAddItem = useCartStore((s) => s.addItem);
  const cartRemoveItem = useCartStore((s) => s.removeItem);
  const cartUpdateQuantity = useCartStore((s) => s.updateQuantity);
  const cartUpdateItemDiscount = useCartStore((s) => s.updateItemDiscount);
  const cartUpdateItemNotes = useCartStore((s) => s.updateItemNotes);
  const cartSetCustomerId = useCartStore((s) => s.setCustomerId);
  const cartSetDiscountTotal = useCartStore((s) => s.setDiscountTotal);
  const cartSetNotes = useCartStore((s) => s.setNotes);
  const cartSetHeld = useCartStore((s) => s.setHeld);
  const cartClear = useCartStore((s) => s.clearCart);
  const cartCustomerId = useCartStore((s) => s.customerId);
  const cartDiscountTotal = useCartStore((s) => s.discountTotal);
  const cartNotesVal = useCartStore((s) => s.notes);
  const { taxConfig, serviceChargeConfig, storeName, storeAddress, storePhone } = useSettingsStore();

  // Reassemble cart object for convenience
  const cart = { items, discountTotal: cartDiscountTotal, notes: cartNotesVal, customerId: cartCustomerId, addItem: cartAddItem, removeItem: cartRemoveItem, updateQuantity: cartUpdateQuantity, updateItemDiscount: cartUpdateItemDiscount, updateItemNotes: cartUpdateItemNotes, setCustomerId: cartSetCustomerId, setDiscountTotal: cartSetDiscountTotal, setNotes: cartSetNotes, setHeld: cartSetHeld, clearCart: cartClear };

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [lastPaidAmount, setLastPaidAmount] = useState(0);
  const [lastChangeAmount, setLastChangeAmount] = useState(0);

  // Payment dialog state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [cashAmount, setCashAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Barcode input
  const [barcodeInput, setBarcodeInput] = useState('');

  // Success animation
  const [showSuccess, setShowSuccess] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['pos-products', searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams({ isActive: 'true', perPage: '200' });
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory !== 'all') params.set('categoryId', selectedCategory);
      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      return (json.data ?? []) as Product[];
    },
  });

  const { data: taxData } = useQuery({
    queryKey: ['tax-setting'],
    queryFn: async () => {
      const res = await fetch('/api/settings/tax');
      const json = await res.json();
      return json.data;
    },
  });

  const { data: scData } = useQuery({
    queryKey: ['sc-setting'],
    queryFn: async () => {
      const res = await fetch('/api/settings/service-charge');
      const json = await res.json();
      return json.data;
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers-short'],
    queryFn: async () => {
      const res = await fetch('/api/customers?perPage=100');
      const json = await res.json();
      return (json.data ?? []) as Customer[];
    },
  });

  const { data: heldTransactions = [], refetch: refetchHeld } = useQuery<Transaction[]>({
    queryKey: ['held-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/transactions/held?userId=${user.id}`);
      const json = await res.json();
      return (json.data ?? []) as Transaction[];
    },
    enabled: !!user?.id,
  });

  // Sync tax & SC config from server
  useEffect(() => {
    if (taxData) {
      useSettingsStore.getState().setTaxConfig({
        isEnabled: taxData.isEnabled,
        percentage: taxData.percentage,
        mode: taxData.mode,
        applyToAll: taxData.applyToAll,
      });
    }
  }, [taxData]);

  useEffect(() => {
    if (scData) {
      useSettingsStore.getState().setServiceChargeConfig({
        isEnabled: scData.isEnabled,
        percentage: scData.percentage,
      });
    }
  }, [scData]);

  // ─── Calculations ────────────────────────────────────────────────────────

  const calculations = useMemo(() => {
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.product.sellPrice * item.quantity - item.discount,
      0
    );
    const afterDiscount = subtotal - cart.discountTotal;
    const tax = taxConfig.isEnabled && taxConfig.mode === 'exclude'
      ? afterDiscount * taxConfig.percentage / 100
      : 0;
    const serviceCharge = serviceChargeConfig.isEnabled
      ? (afterDiscount + tax) * serviceChargeConfig.percentage / 100
      : 0;
    const grandTotal = afterDiscount + tax + serviceCharge;
    return { subtotal, afterDiscount, tax, serviceCharge, grandTotal };
  }, [cart.items, cart.discountTotal, taxConfig, serviceChargeConfig]);

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Payment splits total
  const paymentSplitsTotal = paymentSplits.reduce((sum, s) => sum + s.amount, 0);
  const remainingBalance = Math.max(0, calculations.grandTotal - paymentSplitsTotal);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const createTransactionMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memproses transaksi');
      return json.data as Transaction;
    },
    onSuccess: (data, variables) => {
      const paidAmt = (variables.paidAmount as number) || 0;
      const changeAmt = (variables.changeAmount as number) || 0;
      setLastTransaction(data);
      setLastPaidAmount(paidAmt);
      setLastChangeAmount(changeAmt);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setPaymentDialogOpen(false);
        setReceiptDialogOpen(true);
        cart.clearCart();
        resetPaymentState();
        queryClient.invalidateQueries({ queryKey: ['pos-products'] });
        queryClient.invalidateQueries({ queryKey: ['held-transactions'] });
      }, 1200);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const holdTransactionMutation = useMutation({
    mutationFn: async () => {
      const items = cart.items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.sellPrice,
        costPrice: item.product.costPrice,
        discount: item.discount,
        total: item.product.sellPrice * item.quantity - item.discount,
        notes: item.notes || undefined,
      }));
      const payload = {
        userId: user!.id,
        customerId: cart.customerId || undefined,
        branchId: user!.branchId || undefined,
        type: 'sale',
        status: 'held',
        subtotal: calculations.subtotal,
        discountAmount: cart.discountTotal,
        taxAmount: calculations.tax,
        serviceCharge: calculations.serviceCharge,
        grandTotal: calculations.grandTotal,
        paidAmount: 0,
        changeAmount: 0,
        paymentMethod: 'cash',
        notes: cart.notes || undefined,
        items,
      };
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menahan transaksi');
      return json.data as Transaction;
    },
    onSuccess: () => {
      toast.success('Transaksi berhasil ditahan');
      cart.clearCart();
      setHoldDialogOpen(false);
      refetchHeld();
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // ─── Actions ─────────────────────────────────────────────────────────────

  const addToCart = useCallback(
    (product: Product) => {
      if (product.stock <= 0) return;
      cart.addItem({
        product,
        quantity: 1,
        discount: 0,
        notes: undefined,
      });
      toast.success(`${product.name} ditambahkan`, {
        description: formatRupiah(product.sellPrice),
        duration: 1500,
      });
    },
    [cart]
  );

  const handleBarcodeSearch = useCallback(async () => {
    if (!barcodeInput.trim()) return;
    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcodeInput.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Produk tidak ditemukan');
        return;
      }
      const product = json.data as Product;
      if (product.stock <= 0) {
        toast.error('Stok produk habis');
        return;
      }
      addToCart(product);
      setBarcodeInput('');
      setBarcodeDialogOpen(false);
    } catch {
      toast.error('Gagal mencari produk');
    }
  }, [barcodeInput, addToCart]);

  const resetPaymentState = useCallback(() => {
    setSelectedPaymentMethod('cash');
    setPaymentSplits([]);
    setCashAmount('');
    setPaymentNotes('');
    setSelectedCustomerId('');
    setCustomerSearch('');
  }, []);

  const handleOpenPayment = useCallback(() => {
    if (cart.items.length === 0 || calculations.grandTotal <= 0) return;
    resetPaymentState();
    setPaymentDialogOpen(true);
  }, [cart.items.length, calculations.grandTotal, resetPaymentState]);

  const handleAddPaymentSplit = useCallback(() => {
    setPaymentSplits((prev) => [...prev, { method: selectedPaymentMethod, amount: 0 }]);
  }, [selectedPaymentMethod]);

  const handleUpdateSplitAmount = useCallback((index: number, amount: number) => {
    setPaymentSplits((prev) =>
      prev.map((s, i) => (i === index ? { ...s, amount } : s))
    );
  }, []);

  const handleRemoveSplit = useCallback((index: number) => {
    setPaymentSplits((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcessPayment = useCallback(() => {
    if (cart.items.length === 0) return;

    let paidAmount = 0;
    let paymentMethod = selectedPaymentMethod;
    let changeAmount = 0;
    let paymentDetails: string | undefined;

    if (paymentSplits.length > 0) {
      paidAmount = paymentSplitsTotal;
      paymentMethod = 'multi';
      paymentDetails = JSON.stringify(paymentSplits);
      if (paidAmount > calculations.grandTotal) {
        changeAmount = paidAmount - calculations.grandTotal;
      }
    } else if (selectedPaymentMethod === 'cash') {
      const cash = parseFloat(cashAmount) || 0;
      if (cash < calculations.grandTotal) {
        toast.error('Jumlah pembayaran kurang');
        return;
      }
      paidAmount = cash;
      changeAmount = cash - calculations.grandTotal;
    } else {
      paidAmount = calculations.grandTotal;
      changeAmount = 0;
    }

    const items = cart.items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.sellPrice,
      costPrice: item.product.costPrice,
      discount: item.discount,
      total: item.product.sellPrice * item.quantity - item.discount,
      notes: item.notes || undefined,
    }));

    createTransactionMutation.mutate({
      userId: user!.id,
      customerId: selectedCustomerId || cart.customerId || undefined,
      branchId: user!.branchId || undefined,
      type: 'sale',
      status: 'completed',
      subtotal: calculations.subtotal,
      discountAmount: cart.discountTotal,
      taxAmount: calculations.tax,
      serviceCharge: calculations.serviceCharge,
      grandTotal: calculations.grandTotal,
      paidAmount,
      changeAmount,
      paymentMethod,
      paymentDetails,
      notes: paymentNotes || cart.notes || undefined,
      items,
    });
  }, [
    cart, selectedPaymentMethod, paymentSplits, paymentSplitsTotal, cashAmount,
    calculations, selectedCustomerId, user, paymentNotes, createTransactionMutation,
  ]);

  const handleResumeHeld = useCallback(
    (transaction: Transaction) => {
      if (!transaction.items) return;
      cart.clearCart();
      for (const item of transaction.items) {
        cart.addItem({
          product: {
            id: item.productId,
            name: item.productName,
            sellPrice: item.price,
            costPrice: item.costPrice,
            stock: 999,
            minStock: 0,
            unit: 'pcs',
            isActive: true,
            barcode: undefined,
            sku: undefined,
            categoryId: undefined,
            image: undefined,
            branchId: undefined,
          },
          quantity: item.quantity,
          discount: item.discount,
          notes: item.notes,
        });
      }
      if (transaction.customerId) cart.setCustomerId(transaction.customerId);
      if (transaction.notes) cart.setNotes(transaction.notes);
      cart.setDiscountTotal(transaction.discountAmount);
      cart.setHeld(true, transaction.id);
      setHoldDialogOpen(false);
      toast.success('Transaksi dilanjutkan');
    },
    [cart]
  );

  const handlePrintReceipt = useCallback(() => {
    window.print();
  }, []);

  // ─── Filtered Products ───────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    return products;
  }, [products]);

  // ─── Customer search filter ──────────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [customers, customerSearch]);

  // ─── Keyboard Shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && !barcodeDialogOpen && !paymentDialogOpen) {
        e.preventDefault();
        setBarcodeDialogOpen(true);
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      }
      if (e.key === 'F9' && !paymentDialogOpen && !barcodeDialogOpen) {
        e.preventDefault();
        handleOpenPayment();
      }
      if (e.key === 'Escape') {
        if (barcodeDialogOpen) setBarcodeDialogOpen(false);
        if (paymentDialogOpen && !showSuccess) setPaymentDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barcodeDialogOpen, paymentDialogOpen, showSuccess, handleOpenPayment]);


  // ─── Render: Product Grid Card ───────────────────────────────────────────

  const renderProductCard = (product: Product, index: number) => {
    const isOutOfStock = product.stock <= 0;
    const isLowStock = !isOutOfStock && product.stock <= product.minStock;
    const colorClass = getProductColor(index);

    return (
      <motion.div
        key={product.id}
        {...fadeInUp}
        layout
        className={cn(
          'group relative flex flex-col rounded-xl border bg-card p-3 shadow-sm transition-all',
          isOutOfStock
            ? 'cursor-not-allowed opacity-50 grayscale'
            : 'cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.98]'
        )}
        onClick={() => !isOutOfStock && addToCart(product)}
      >
        {/* Image placeholder */}
        <div
          className={cn(
            'mb-3 flex h-20 items-center justify-center rounded-lg text-2xl font-bold',
            colorClass
          )}
        >
          {product.name.charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <p className="mb-1 text-sm font-medium leading-tight line-clamp-2 text-foreground">
          {product.name}
        </p>

        {/* Price */}
        <p className="text-sm font-bold text-primary">
          {formatRupiah(product.sellPrice)}
        </p>

        {/* Stock badge */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Stok: {product.stock} {product.unit}
          </span>
          {isLowStock && (
            <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px] px-1.5 py-0">
              <AlertTriangle className="size-3 mr-0.5" />
              Menipis
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Habis
            </Badge>
          )}
        </div>
      </motion.div>
    );
  };

  // ─── Render: Cart Item Row ───────────────────────────────────────────────

  const renderCartItem = (item: CartItem) => {
    const itemTotal = item.product.sellPrice * item.quantity - item.discount;
    return (
      <motion.div
        key={item.product.id}
        {...cartItemVariants}
        layout
        className="flex flex-col gap-1.5 rounded-lg border bg-card p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {item.product.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatRupiah(item.product.sellPrice)} × {item.quantity}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Notes popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Catatan"
                >
                  <Pencil className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" side="left">
                <Label className="text-xs font-medium">Catatan item</Label>
                <Textarea
                  placeholder="Contoh: tidak pakai es..."
                  className="mt-1.5 min-h-[60px] text-sm"
                  value={item.notes || ''}
                  onChange={(e) =>
                    cart.updateItemNotes(item.product.id, e.target.value)
                  }
                />
              </PopoverContent>
            </Popover>
            {/* Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              aria-label="Hapus"
              onClick={() => cart.removeItem(item.product.id)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() =>
                cart.updateQuantity(item.product.id, item.quantity - 1)
              }
              aria-label="Kurangi"
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-8 text-center text-sm font-semibold">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() =>
                cart.updateQuantity(
                  item.product.id,
                  Math.min(item.quantity + 1, item.product.stock)
                )
              }
              disabled={item.quantity >= item.product.stock}
              aria-label="Tambah"
            >
              <Plus className="size-3" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Discount input */}
            <div className="relative">
              <Input
                type="number"
                min={0}
                placeholder="Diskon"
                className="h-7 w-16 text-right text-xs px-1.5"
                value={item.discount || ''}
                onChange={(e) =>
                  cart.updateItemDiscount(
                    item.product.id,
                    Math.max(0, parseFloat(e.target.value) || 0)
                  )
                }
              />
            </div>
            <span className="text-sm font-bold text-foreground w-24 text-right">
              {formatRupiah(itemTotal)}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  // ─── Render: Cart Panel (shared between desktop and mobile) ──────────────

  const renderCartContent = () => (
    <div className="flex h-full flex-col">
      {/* Cart Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Keranjang</h2>
          {totalItems > 0 && (
            <Badge variant="default" className="text-xs px-1.5 py-0 h-5">
              {totalItems}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {heldTransactions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setHoldDialogOpen(true)}
            >
              <Play className="size-3.5" />
              <span className="hidden sm:inline">Lanjutkan</span>
              <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1 py-0">
                {heldTransactions.length}
              </Badge>
            </Button>
          )}
          {cart.items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => holdTransactionMutation.mutate()}
              disabled={holdTransactionMutation.isPending}
            >
              <Pause className="size-3.5" />
              <span className="hidden sm:inline">Tahan</span>
            </Button>
          )}
          {cart.items.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => {
                cart.clearCart();
                toast.info('Keranjang dikosongkan');
              }}
              aria-label="Kosongkan keranjang"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {cart.items.length === 0 ? (
              <motion.div
                {...fadeInUp}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-muted">
                  <ShoppingCart className="size-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Keranjang kosong
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Klik produk untuk menambahkan
                </p>
              </motion.div>
            ) : (
              cart.items.map(renderCartItem)
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Calculations & Payment */}
      {cart.items.length > 0 && (
        <div className="border-t bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatRupiah(calculations.subtotal)}</span>
          </div>

          {cart.discountTotal > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Diskon</span>
              <span className="text-destructive">
                -{formatRupiah(cart.discountTotal)}
              </span>
            </div>
          )}

          {taxConfig.isEnabled && calculations.tax > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Pajak ({taxConfig.percentage}%)
              </span>
              <span>{formatRupiah(calculations.tax)}</span>
            </div>
          )}

          {serviceChargeConfig.isEnabled && calculations.serviceCharge > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Service Charge ({serviceChargeConfig.percentage}%)
              </span>
              <span>{formatRupiah(calculations.serviceCharge)}</span>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xl font-bold text-primary">
              {formatRupiah(calculations.grandTotal)}
            </span>
          </div>

          <Button
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-12 text-base"
            onClick={handleOpenPayment}
          >
            <CircleDollarSign className="size-5" />
            Bayar
          </Button>
        </div>
      )}
    </div>
  );

  // ─── Main Layout ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row md:h-[calc(100vh-64px)] overflow-hidden">
      {/* LEFT PANEL: Product Selection */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex-shrink-0 border-b bg-card px-3 py-3 md:px-5">
          {/* Search & Barcode Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Cari produk atau barcode... (F2)"
                className="pl-9 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="h-10 gap-2"
              onClick={() => {
                setBarcodeDialogOpen(true);
                setTimeout(() => barcodeInputRef.current?.focus(), 100);
              }}
            >
              <ScanBarcode className="size-4" />
              <span className="hidden sm:inline">Barcode</span>
            </Button>
          </div>

          {/* Category Pills */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              onClick={() => setSelectedCategory('all')}
            >
              Semua
            </button>
            {categoriesLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 shrink-0 rounded-full" />
                ))
              : categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={cn(
                      'shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </button>
                ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col rounded-xl border bg-card p-3"
                >
                  <Skeleton className="mb-3 h-20 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <motion.div
              {...fadeInUp}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-muted">
                <Package className="size-9 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-muted-foreground">
                Produk tidak ditemukan
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Coba ubah kata kunci atau kategori pencarian
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product, i) => renderProductCard(product, i))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Cart (Desktop) */}
      <div className="hidden md:flex w-[400px] xl:w-[420px] flex-shrink-0 flex-col border-l bg-background">
        {renderCartContent()}
      </div>

      {/* Mobile Cart FAB + Sheet */}
      <div className="md:hidden">
        {/* FAB */}
        <AnimatePresence>
          {cart.items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="fixed bottom-20 left-4 right-4 z-40"
            >
              <Button
                size="lg"
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg rounded-2xl"
                onClick={() => setCartSheetOpen(true)}
              >
                <ShoppingCart className="size-5" />
                <span className="font-semibold">
                  {totalItems} Item — {formatRupiah(calculations.grandTotal)}
                </span>
                <ChevronDown className="size-4 ml-auto" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart Sheet (Bottom) */}
        <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
            <SheetHeader className="px-4 pt-2 pb-0">
              <SheetTitle>Keranjang Belanja</SheetTitle>
              <SheetDescription>
                {totalItems} item — Total {formatRupiah(calculations.grandTotal)}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-2 flex-1 overflow-hidden">
              {renderCartContent()}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ═══ BARCODE DIALOG ═══ */}
      <Dialog open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="size-5" />
              Scan Barcode
            </DialogTitle>
            <DialogDescription>
              Masukkan kode barcode untuk mencari produk
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              ref={barcodeInputRef}
              placeholder="Ketik atau scan barcode..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBarcodeSearch();
              }}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={handleBarcodeSearch}
              disabled={!barcodeInput.trim()}
            >
              Cari
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tekan <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Enter</kbd> untuk mencari atau <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Esc</kbd> untuk menutup
          </p>
        </DialogContent>
      </Dialog>

      {/* ═══ HOLD TRANSACTIONS DIALOG ═══ */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="size-5" />
              Transaksi Ditahan
            </DialogTitle>
            <DialogDescription>
              {heldTransactions.length} transaksi sedang ditahan
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {heldTransactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada transaksi yang ditahan
              </div>
            ) : (
              <div className="space-y-2 pr-3">
                {heldTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {t.items?.length} item
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.heldAt ? formatDateTime(t.heldAt) : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-primary">
                        {formatRupiah(t.grandTotal)}
                      </span>
                      <Button
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => handleResumeHeld(t)}
                      >
                        <Play className="size-3.5" />
                        Lanjutkan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ═══ PAYMENT DIALOG ═══ */}
      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          if (!open && !showSuccess) {
            setPaymentDialogOpen(false);
            resetPaymentState();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Success Overlay */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/95 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <CheckCircle2 className="size-20 text-emerald-500" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-lg font-semibold"
                >
                  Pembayaran Berhasil!
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-muted-foreground"
                >
                  Menyiapkan struk...
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDollarSign className="size-5" />
              Pembayaran
            </DialogTitle>
            <DialogDescription>
              Total: {formatRupiah(calculations.grandTotal)}
            </DialogDescription>
          </DialogHeader>

          {/* Payment Method Grid */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Metode Pembayaran
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <Button
                    key={method.value}
                    variant={selectedPaymentMethod === method.value ? 'default' : 'outline'}
                    className={cn(
                      'h-auto flex-col gap-1.5 py-3',
                      selectedPaymentMethod === method.value && 'ring-2 ring-primary ring-offset-2'
                    )}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                  >
                    {method.icon}
                    <span className="text-xs">{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Multi-payment add button */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={handleAddPaymentSplit}
              >
                <Plus className="size-3.5" />
                Tambah Pembayaran
              </Button>
              {paymentSplits.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Sisa: {formatRupiah(remainingBalance)}
                </span>
              )}
            </div>

            {/* Payment Splits List */}
            <AnimatePresence>
              {paymentSplits.length > 0 && (
                <motion.div
                  {...scaleIn}
                  className="space-y-2 rounded-lg border p-3"
                >
                  {paymentSplits.map((split, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">
                        {PAYMENT_METHODS.find((m) => m.value === split.method)?.label}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        className="h-8 flex-1 text-right text-sm"
                        value={split.amount || ''}
                        onChange={(e) =>
                          handleUpdateSplitAmount(
                            i,
                            Math.max(0, parseFloat(e.target.value) || 0)
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => handleRemoveSplit(i)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total dibayar</span>
                    <span className="font-semibold">{formatRupiah(paymentSplitsTotal)}</span>
                  </div>
                  {remainingBalance > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sisa</span>
                      <span className="font-semibold text-destructive">
                        {formatRupiah(remainingBalance)}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cash Payment Section */}
            {selectedPaymentMethod === 'cash' && paymentSplits.length === 0 && (
              <div className="space-y-3 rounded-lg border p-3">
                <Label className="text-sm font-medium">Jumlah Uang</Label>
                {/* Quick cash buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={cashAmount === String(calculations.grandTotal) ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setCashAmount(String(calculations.grandTotal))}
                  >
                    Uang Pas
                  </Button>
                  {QUICK_CASH_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      variant={cashAmount === String(amount) ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => setCashAmount(String(amount))}
                    >
                      {formatRupiah(amount).replace('Rp', '').trim()}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={0}
                  placeholder="Masukkan jumlah..."
                  className="text-right text-lg font-semibold"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  autoFocus
                />
                {/* Change calculation */}
                {cashAmount && parseFloat(cashAmount) >= calculations.grandTotal && (
                  <motion.div
                    {...scaleIn}
                    className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3"
                  >
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Kembalian
                    </span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(
                        parseFloat(cashAmount) - calculations.grandTotal
                      )}
                    </span>
                  </motion.div>
                )}
                {cashAmount && parseFloat(cashAmount) > 0 && parseFloat(cashAmount) < calculations.grandTotal && (
                  <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-3">
                    <span className="text-sm font-medium text-destructive">
                      Kurang
                    </span>
                    <span className="text-sm font-bold text-destructive">
                      {formatRupiah(calculations.grandTotal - parseFloat(cashAmount))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Customer Selection (Optional) */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Pelanggan (Opsional)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left font-normal"
                  >
                    {selectedCustomerId
                      ? customers.find((c) => c.id === selectedCustomerId)?.name || 'Pilih pelanggan...'
                      : 'Pilih pelanggan...'}
                    <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  <Input
                    placeholder="Cari nama/telp..."
                    className="mb-2 h-8 text-sm"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  <ScrollArea className="max-h-48">
                    <div className="space-y-0.5">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent transition-colors',
                            selectedCustomerId === c.id && 'bg-accent'
                          )}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                          }}
                        >
                          <User className="size-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{c.name}</p>
                            {c.phone && (
                              <p className="text-xs text-muted-foreground">
                                {c.phone}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          Pelanggan tidak ditemukan
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium mb-2 block flex items-center gap-1.5">
                <StickyNote className="size-3.5" />
                Catatan (Opsional)
              </Label>
              <Textarea
                placeholder="Catatan transaksi..."
                className="min-h-[60px] text-sm"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialogOpen(false);
                resetPaymentState();
              }}
              disabled={showSuccess}
            >
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleProcessPayment}
              disabled={
                showSuccess ||
                createTransactionMutation.isPending ||
                (selectedPaymentMethod === 'cash' &&
                  paymentSplits.length === 0 &&
                  (!cashAmount || parseFloat(cashAmount) < calculations.grandTotal)) ||
                (paymentSplits.length > 0 && paymentSplitsTotal < calculations.grandTotal)
              }
            >
              {createTransactionMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Proses Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ RECEIPT DIALOG ═══ */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden" showCloseButton={false}>
          {/* Thermal receipt style */}
          <div id="receipt-print" className="bg-white text-black p-6 font-mono text-xs">
            {/* Store Info */}
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-base">{storeName || 'Toko Sejahtera'}</p>
              {storeAddress && (
                <p className="text-[10px] text-gray-600 mt-0.5">{storeAddress}</p>
              )}
              {storePhone && (
                <p className="text-[10px] text-gray-600">Telp: {storePhone}</p>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Transaction Info */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>No. Invoice</span>
                <span className="font-semibold">{lastTransaction?.invoiceNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal</span>
                <span>{lastTransaction?.completedAt ? formatDateTime(lastTransaction.completedAt) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir</span>
                <span>{user?.name || '-'}</span>
              </div>
              {lastTransaction?.customer && (
                <div className="flex justify-between">
                  <span>Pelanggan</span>
                  <span>{lastTransaction.customer.name}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Items */}
            <div className="space-y-1.5">
              {lastTransaction?.items?.map((item) => (
                <div key={item.id}>
                  <p className="font-medium text-[11px]">{item.productName}</p>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>
                      {item.quantity} × {formatRupiah(item.price)}
                    </span>
                    <span>{formatRupiah(item.total)}</span>
                  </div>
                  {item.discount > 0 && (
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Diskon</span>
                      <span>-{formatRupiah(item.discount)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Totals */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(lastTransaction?.subtotal || 0)}</span>
              </div>
              {(lastTransaction?.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span>Diskon</span>
                  <span>-{formatRupiah(lastTransaction?.discountAmount || 0)}</span>
                </div>
              )}
              {(lastTransaction?.taxAmount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span>Pajak</span>
                  <span>{formatRupiah(lastTransaction?.taxAmount || 0)}</span>
                </div>
              )}
              {(lastTransaction?.serviceCharge ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge</span>
                  <span>{formatRupiah(lastTransaction?.serviceCharge || 0)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 my-2" />

            <div className="flex justify-between text-sm font-bold">
              <span>TOTAL</span>
              <span>{formatRupiah(lastTransaction?.grandTotal || 0)}</span>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Payment Info */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Metode Bayar</span>
                <span className="uppercase">
                  {PAYMENT_METHODS.find(
                    (m) => m.value === lastTransaction?.paymentMethod
                  )?.label || lastTransaction?.paymentMethod || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dibayar</span>
                <span>{formatRupiah(lastPaidAmount || lastTransaction?.paidAmount || 0)}</span>
              </div>
              {(lastChangeAmount || lastTransaction?.changeAmount || 0) > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Kembalian</span>
                  <span>{formatRupiah(lastChangeAmount || lastTransaction?.changeAmount || 0)}</span>
                </div>
              )}
            </div>

            {lastTransaction?.notes && (
              <>
                <div className="border-t border-dashed border-gray-400 my-2" />
                <p className="text-[10px] text-gray-500">Catatan: {lastTransaction.notes}</p>
              </>
            )}

            <div className="border-t border-dashed border-gray-400 my-2" />

            <p className="text-center text-[11px] font-semibold mt-2">
              Terima Kasih!
            </p>
            <p className="text-center text-[9px] text-gray-500 mt-0.5">
              Simpan struk ini sebagai bukti pembayaran
            </p>
          </div>

          <div className="flex gap-2 p-4 pt-0">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handlePrintReceipt}
            >
              <Printer className="size-4" />
              Cetak
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setReceiptDialogOpen(false)}
            >
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

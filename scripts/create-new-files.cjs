const fs = require('fs');
const path = require('path');

// ─── Helper: mkdirp ─────────────────────────────────────────────────────────

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// ─── File definitions ───────────────────────────────────────────────────────

const files = [];
let totalLines = 0;

// ─── 1. src/lib/notification-service.ts ─────────────────────────────────────

{
  const content = `import { db } from '@/lib/db'

export type NotificationType =
  | 'low_stock'
  | 'out_of_stock'
  | 'sale_completed'
  | 'payment_received'
  | 'new_user'
  | 'purchase_received'
  | 'system'

interface CreateNotificationInput {
  type: NotificationType
  title: string
  message: string
  userId?: string | null  // null = broadcast
  data?: Record<string, unknown>
}

/**
 * Create a notification. If userId is null, it broadcasts to all users.
 */
export async function createNotification(input: CreateNotificationInput) {
  return db.notification.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      userId: input.userId ?? null,
      data: input.data ? JSON.stringify(input.data) : null,
    },
  })
}

/**
 * Check low stock products and create notifications.
 * Call this after every transaction completion or stock change.
 */
export async function checkAndNotifyLowStock() {
  const lowStockProducts = await db.product.findMany({
    where: { isActive: true },
    orderBy: { stock: 'asc' },
    take: 50,
    include: { category: true },
  })

  for (const product of lowStockProducts) {
    if (product.stock <= 0) {
      // Check if we already notified about this today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const existing = await db.notification.findFirst({
        where: {
          type: 'out_of_stock',
          message: { contains: product.name },
          createdAt: { gte: today },
        },
      })
      if (!existing) {
        await createNotification({
          type: 'out_of_stock',
          title: 'Stok Habis!',
          message: \`\${product.name} (stok: 0) sudah habis. Segera lakukan pembelian ulang.\`,
          data: { productId: product.id, stock: product.stock },
        })
      }
    } else if (product.stock <= product.minStock) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const existing = await db.notification.findFirst({
        where: {
          type: 'low_stock',
          message: { contains: product.name },
          createdAt: { gte: today },
        },
      })
      if (!existing) {
        await createNotification({
          type: 'low_stock',
          title: 'Stok Menipis',
          message: \`\${product.name} tersisa \${product.stock} \${product.unit} (min: \${product.minStock}).\`,
          data: { productId: product.id, stock: product.stock, minStock: product.minStock },
        })
      }
    }
  }
}

/**
 * Notify after a sale is completed.
 */
export async function notifySaleCompleted(invoiceNumber: string, total: number) {
  await createNotification({
    type: 'sale_completed',
    title: 'Transaksi Berhasil',
    message: \`Penjualan \${invoiceNumber} selesai — Rp \${total.toLocaleString('id-ID')}\`,
    data: { invoiceNumber, total },
  })
}

/**
 * Notify when a purchase is received.
 */
export async function notifyPurchaseReceived(invoiceNumber: string, total: number) {
  await createNotification({
    type: 'purchase_received',
    title: 'Pembelian Diterima',
    message: \`Pembelian \${invoiceNumber} diterima — Rp \${total.toLocaleString('id-ID')}\`,
    data: { invoiceNumber, total },
  })
}

/**
 * Notify system events.
 */
export async function notifySystem(title: string, message: string) {
  await createNotification({
    type: 'system',
    title,
    message,
  })
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'lib', 'notification-service.ts');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[1/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── 2. src/lib/api-error.ts ─────────────────────────────────────────────────

{
  const content = `import { NextResponse } from 'next/server'

/**
 * Classify a database/connection error and return a user-friendly response.
 */
export function classifyError(error: unknown): NextResponse {
  const msg = error instanceof Error ? error.message : String(error)

  // No DATABASE_URL configured
  if (msg.includes('INVALID_ARGUMENT') || msg.includes('Environment variable')) {
    return NextResponse.json(
      {
        error: 'Database belum dikonfigurasi',
        hint: 'Set DATABASE_URL di Vercel > Settings > Environment Variables',
      },
      { status: 503 }
    )
  }

  // Can't reach database
  if (
    msg.includes('P1001') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('fetch failed') ||
    msg.includes('connect ETIMEDOUT')
  ) {
    return NextResponse.json(
      {
        error: 'Tidak dapat terhubung ke database',
        hint: 'Periksa DATABASE_URL. Pastikan project Supabase aktif (bukan paused).',
      },
      { status: 503 }
    )
  }

  // Authentication error
  if (msg.includes('P3000') || msg.includes('authentication failed') || msg.includes('password authentication')) {
    return NextResponse.json(
      {
        error: 'Autentikasi database gagal',
        hint: 'Periksa password di DATABASE_URL',
      },
      { status: 503 }
    )
  }

  // Table/model doesn't exist (schema not pushed)
  if (msg.includes('P2021') || msg.includes('does not exist') || msg.includes('relation')) {
    return NextResponse.json(
      {
        error: 'Tabel database belum dibuat',
        hint: 'Jalankan: npx prisma db push',
      },
      { status: 503 }
    )
  }

  // RLS / permission denied
  if (msg.includes('permission denied') || msg.includes('P2025')) {
    return NextResponse.json(
      {
        error: 'Akses database ditolak (RLS aktif)',
        hint: 'Nonaktifkan RLS di semua tabel Supabase',
      },
      { status: 503 }
    )
  }

  // Generic fallback
  return NextResponse.json(
    {
      error: 'Terjadi kesalahan server',
      details: msg,
    },
    { status: 500 }
  )
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'lib', 'api-error.ts');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[2/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── 3. src/app/api/notifications/route.ts ──────────────────────────────────

{
  const content = `import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { classifyError } from '@/lib/api-error'

// GET /api/notifications?unreadOnly=true&limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    if (unreadOnly) where.isRead = false
    if (type) where.type = type

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await db.notification.count({
      where: { isRead: false },
    })

    return NextResponse.json({
      data: notifications,
      unreadCount,
    })
  } catch (error) {
    return classifyError(error)
  }
}

// POST /api/notifications — create a notification (for manual/testing use)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, message, userId, data } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'title dan message wajib diisi' },
        { status: 400 }
      )
    }

    const notification = await db.notification.create({
      data: {
        type: type || 'system',
        title,
        message,
        userId: userId || null,
        data: data ? JSON.stringify(data) : null,
      },
    })

    return NextResponse.json({ data: notification }, { status: 201 })
  } catch (error) {
    return classifyError(error)
  }
}

// DELETE /api/notifications?olderThan=7 (days)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const olderThanDays = parseInt(searchParams.get('olderThan') || '30', 10)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)

    const result = await db.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    return classifyError(error)
  }
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'notifications', 'route.ts');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[3/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── 4. src/app/api/notifications/read-all/route.ts ─────────────────────────

{
  const content = `import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { classifyError } from '@/lib/api-error'

// PUT /api/notifications/read-all
export async function PUT() {
  try {
    await db.notification.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return classifyError(error)
  }
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'notifications', 'read-all', 'route.ts');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[4/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── 5. src/app/api/notifications/[id]/read/route.ts ─────────────────────────

{
  const content = `import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { classifyError } from '@/lib/api-error'

// PUT /api/notifications/[id]/read
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const notification = await db.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({ data: notification })
  } catch (error) {
    return classifyError(error)
  }
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'notifications', '[id]', 'read', 'route.ts');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[5/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── 6. src/app/api/notifications/settings/route.ts ─────────────────────────

{
  const content = `import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { classifyError } from '@/lib/api-error'

// GET /api/notifications/settings?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json(
        { error: 'userId wajib' },
        { status: 400 }
      )
    }

    let setting = await db.notificationSetting.findUnique({
      where: { userId },
    })

    // Auto-create if not exists
    if (!setting) {
      setting = await db.notificationSetting.create({
        data: { userId },
      })
    }

    return NextResponse.json({ data: setting })
  } catch (error) {
    return classifyError(error)
  }
}

// PUT /api/notifications/settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, ...settings } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId wajib' },
        { status: 400 }
      )
    }

    const setting = await db.notificationSetting.upsert({
      where: { userId },
      create: { userId, ...settings },
      update: settings,
    })

    return NextResponse.json({ data: setting })
  } catch (error) {
    return classifyError(error)
  }
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'app', 'api', 'notifications', 'settings', 'route.ts');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[6/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── 7. src/features/settings/AccountSettings.tsx ────────────────────────────

{
  const content = `'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  KeyRound,
  Mail,
  Phone,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuthStore } from '@/store';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AccountSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  cashier: 'Kasir',
  cashir: 'Kasir',
};

// ─── Schema: Edit Profile ────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().optional().default(''),
});

type ProfileForm = z.infer<typeof profileSchema>;

// ─── Schema: Change Password ──────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password lama wajib diisi'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccountSettings({ onBack }: AccountSettingsProps) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const userId = user?.id;

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ─── Profile Form ───────────────────────────────────────────────────────

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileForm) => {
      if (!userId) throw new Error('User belum login');
      const res = await fetch(\`/api/auth/\${userId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui profil');
      return json;
    },
    onSuccess: (data) => {
      toast.success('Profil berhasil diperbarui');
      if (data.user) {
        updateUser(data.user);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const onProfileSubmit = (values: ProfileForm) => profileMutation.mutate(values);

  // ─── Password Form ───────────────────────────────────────────────────────

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: ChangePasswordForm) => {
      if (!userId) throw new Error('User belum login');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          oldPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengubah password');
      return json;
    },
    onSuccess: () => {
      toast.success('Password berhasil diubah');
      passwordForm.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const onPasswordSubmit = (values: ChangePasswordForm) => passwordMutation.mutate(values);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Akun Saya</h1>
          <p className="text-muted-foreground text-sm">
            Kelola informasi profil dan keamanan akun Anda
          </p>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-emerald-600" />
            Informasi Akun
          </CardTitle>
          <CardDescription>
            Detail akun yang sedang aktif
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Avatar placeholder */}
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
              <span className="text-2xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold">{user?.name || '-'}</h3>
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {roleLabels[user?.role || ''] || user?.role || '-'}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email || '-'}
                </span>
                {user?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-emerald-600" />
            Edit Profil
          </CardTitle>
          <CardDescription>
            Perbarui nama dan nomor telepon Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama lengkap" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon</FormLabel>
                    <FormControl>
                      <Input placeholder="08xxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator />
              <Button type="submit" disabled={profileMutation.isPending} className="gap-2">
                {profileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan Profil
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-emerald-600" />
            Ubah Password
          </CardTitle>
          <CardDescription>
            Pastikan password Anda kuat dan aman. Gunakan minimal 6 karakter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              {/* Current Password */}
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Saat Ini</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Masukkan password saat ini"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* New Password */}
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Baru</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Minimal 6 karakter"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password Baru</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Ulangi password baru"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <Button type="submit" disabled={passwordMutation.isPending} className="gap-2">
                {passwordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Ubah Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'features', 'settings', 'AccountSettings.tsx');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[7/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── 8. src/features/settings/StoreInfoSettings.tsx ──────────────────────────

{
  const content = `'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StoreInfoSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const timezoneOptions = [
  { label: 'Asia/Jakarta (WIB)', value: 'Asia/Jakarta' },
  { label: 'Asia/Makassar (WITA)', value: 'Asia/Makassar' },
  { label: 'Asia/Jayapura (WIT)', value: 'Asia/Jayapura' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const storeInfoSchema = z.object({
  store_name: z.string().min(1, 'Nama toko wajib diisi'),
  store_address: z.string().default(''),
  store_phone: z.string().default(''),
  store_email: z.string().email('Email tidak valid').or(z.literal('')).default(''),
  store_npwp: z.string().default(''),
  store_receipt_footer: z.string().default(''),
  store_timezone: z.string().default('Asia/Jakarta'),
});

type StoreInfoForm = z.infer<typeof storeInfoSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function StoreInfoSettings({ onBack }: StoreInfoSettingsProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Gagal memuat pengaturan');
      const json = await res.json();
      return json.data as Record<string, string>;
    },
  });

  const form = useForm<StoreInfoForm>({
    resolver: zodResolver(storeInfoSchema),
    defaultValues: {
      store_name: '',
      store_address: '',
      store_phone: '',
      store_email: '',
      store_npwp: '',
      store_receipt_footer: '',
      store_timezone: 'Asia/Jakarta',
    },
    values: data
      ? {
          store_name: data.store_name || '',
          store_address: data.store_address || '',
          store_phone: data.store_phone || '',
          store_email: data.store_email || '',
          store_npwp: data.store_npwp || '',
          store_receipt_footer: data.store_receipt_footer || '',
          store_timezone: data.store_timezone || 'Asia/Jakarta',
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (values: StoreInfoForm) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      return json;
    },
    onSuccess: () => {
      toast.success('Pengaturan toko berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: StoreInfoForm) => mutation.mutate(values);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Informasi Toko</h1>
          <p className="text-muted-foreground text-sm">
            Kelola informasi dasar toko Anda
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5 text-emerald-600" />
            Detail Informasi Toko
          </CardTitle>
          <CardDescription>
            Informasi ini akan ditampilkan pada struk dan laporan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Nama Toko */}
                <FormField
                  control={form.control}
                  name="store_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Toko</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama toko" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alamat */}
                <FormField
                  control={form.control}
                  name="store_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan alamat lengkap toko" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telepon & Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="store_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telepon</FormLabel>
                        <FormControl>
                          <Input placeholder="08xxxxxxxxxx" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="store_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@toko.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* NPWP */}
                <FormField
                  control={form.control}
                  name="store_npwp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID (NPWP)</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000.0-000.000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Receipt Footer */}
                <FormField
                  control={form.control}
                  name="store_receipt_footer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Footer Struk</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Terima kasih atas kunjungan Anda..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Zona Waktu */}
                <FormField
                  control={form.control}
                  name="store_timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona Waktu</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih zona waktu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timezoneOptions.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Submit */}
                <Button type="submit" disabled={mutation.isPending} className="gap-2">
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Pengaturan Toko
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'features', 'settings', 'StoreInfoSettings.tsx');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[8/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── 9. src/features/settings/NotificationSettings.tsx ────────────────────────

{
  const content = `'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  Bell,
  PackageX,
  PackageOpen,
  ShoppingCart,
  BarChart3,
  UserPlus,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store';

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

interface NotificationPreferences {
  lowStockAlert: boolean;
  outOfStockAlert: boolean;
  saleCompleted: boolean;
  dailyReport: boolean;
  newUserAlert: boolean;
  purchaseAlert: boolean;
  systemAlert: boolean;
}

const defaultPreferences: NotificationPreferences = {
  lowStockAlert: true,
  outOfStockAlert: true,
  saleCompleted: false,
  dailyReport: false,
  newUserAlert: false,
  purchaseAlert: true,
  systemAlert: true,
};

const allKeys = Object.keys(defaultPreferences) as (keyof NotificationPreferences)[];

const notificationToggles: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: 'lowStockAlert',
    label: 'Stok Menipis',
    description: 'Terima notifikasi saat stok produk mendekati batas minimum',
    icon: PackageX,
  },
  {
    key: 'outOfStockAlert',
    label: 'Stok Habis',
    description: 'Terima notifikasi saat stok produk sudah habis',
    icon: PackageOpen,
  },
  {
    key: 'saleCompleted',
    label: 'Transaksi Selesai',
    description: 'Terima notifikasi setiap kali transaksi berhasil diselesaikan',
    icon: ShoppingCart,
  },
  {
    key: 'dailyReport',
    label: 'Laporan Harian',
    description: 'Terima ringkasan laporan penjualan setiap hari',
    icon: BarChart3,
  },
  {
    key: 'newUserAlert',
    label: 'User Baru',
    description: 'Terima notifikasi saat ada user baru yang terdaftar di sistem',
    icon: UserPlus,
  },
  {
    key: 'purchaseAlert',
    label: 'Pembelian Diterima',
    description: 'Terima notifikasi saat pembelian dari supplier berhasil dicatat',
    icon: Truck,
  },
  {
    key: 'systemAlert',
    label: 'Notifikasi Sistem',
    description: 'Terima notifikasi penting dari sistem seperti pembaruan atau error',
    icon: AlertCircle,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationSettings({ onBack }: NotificationSettingsProps) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notification-settings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User belum login');
      const res = await fetch(\`/api/notifications/settings?userId=\${userId}\`);
      if (!res.ok) throw new Error('Gagal memuat pengaturan notifikasi');
      const json = await res.json();
      return json.data as NotificationPreferences;
    },
    enabled: !!userId,
  });

  // Server values (defaults merged with fetched data)
  const serverValues = useMemo<NotificationPreferences>(() => {
    if (!data) return defaultPreferences;
    return { ...defaultPreferences, ...data };
  }, [data]);

  // Track user overrides separately (keys that were toggled)
  const [overrides, setOverrides] = useState<Partial<NotificationPreferences>>({});
  const [savedServerValues, setSavedServerValues] = useState<NotificationPreferences>(serverValues);

  // Final preferences = server values merged with local overrides
  const preferences = useMemo<NotificationPreferences>(() => {
    return { ...savedServerValues, ...overrides };
  }, [savedServerValues, overrides]);

  // Detect unsaved changes
  const hasChanges = useMemo(() => {
    return allKeys.some((key) => overrides[key] !== undefined && overrides[key] !== savedServerValues[key]);
  }, [overrides, savedServerValues]);

  const handleToggle = useCallback((key: keyof NotificationPreferences) => {
    setOverrides((prev) => {
      // Toggle: if currently overridden to true → remove override (revert), else set to flipped
      const currentVal = prev[key] !== undefined ? prev[key] : savedServerValues[key];
      const newVal = !currentVal;
      const next = { ...prev, [key]: newVal };
      return next;
    });
  }, [savedServerValues]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User belum login');
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...preferences }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');
      return json;
    },
    onSuccess: () => {
      toast.success('Pengaturan notifikasi berhasil disimpan');
      // Merge overrides into saved server values and clear overrides
      const newSaved = { ...savedServerValues, ...overrides };
      queueMicrotask(() => {
        setSavedServerValues(newSaved);
        setOverrides({});
      });
      queryClient.invalidateQueries({ queryKey: ['notification-settings', userId] });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Notifikasi</h1>
          <p className="text-muted-foreground text-sm">
            Atur notifikasi yang ingin Anda terima dari sistem
          </p>
        </div>
      </div>

      {/* Description Card */}
      <Card className="rounded-xl border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Aktifkan atau nonaktifkan notifikasi sesuai kebutuhan Anda. Notifikasi yang dipilih akan dikirim secara real-time saat peristiwa terjadi.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Toggle List */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-emerald-600" />
            Preferensi Notifikasi
          </CardTitle>
          <CardDescription>
            Pilih jenis notifikasi yang ingin Anda terima
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {notificationToggles.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0 mt-0.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences[item.key]}
                        onCheckedChange={() => handleToggle(item.key)}
                        className="shrink-0 ml-3"
                      />
                    </div>
                    {index < notificationToggles.length - 1 && (
                      <Separator />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Separator className="my-3" />

          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasChanges}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'features', 'settings', 'NotificationSettings.tsx');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[9/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── 10. src/features/settings/AppearanceSettings.tsx ─────────────────────────

{
  const content = `'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Sun, Moon, Monitor, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppearanceSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const themeOptions = [
  {
    value: 'light',
    label: 'Terang',
    description: 'Tampilan dengan latar belakang terang',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Gelap',
    description: 'Tampilan dengan latar belakang gelap',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'Sistem',
    description: 'Mengikuti pengaturan sistem operasi Anda',
    icon: Monitor,
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppearanceSettings({ onBack }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const mount = useCallback(() => setMounted(true), []);
  useEffect(() => {
    queueMicrotask(mount);
  }, [mount]);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tampilan</h1>
          <p className="text-muted-foreground text-sm">
            Personalisasi tampilan aplikasi sesuai preferensi Anda
          </p>
        </div>
      </div>

      {/* Theme Selection */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-emerald-600" />
            Tema Aplikasi
          </CardTitle>
          <CardDescription>
            Pilih tema yang nyaman untuk mata Anda saat menggunakan aplikasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setTheme(option.value);
                      toast.success(\`Tema diubah ke \${option.label}\`);
                    }}
                    className={cn(
                      'relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all text-center cursor-pointer',
                      'hover:bg-muted/50',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                        : 'border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-12 h-12 rounded-xl transition-colors',
                        isSelected
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border-2 p-5 space-y-3 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-muted mx-auto" />
                  <div className="h-4 w-16 bg-muted rounded mx-auto" />
                  <div className="h-3 w-28 bg-muted rounded mx-auto" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Bahasa
          </CardTitle>
          <CardDescription>
            Pilih bahasa untuk tampilan aplikasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className={cn(
                'relative flex-1 flex items-center gap-3 rounded-xl border-2 px-5 py-4 transition-all cursor-pointer',
                'hover:bg-muted/50',
                'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <span className="text-lg font-bold">ID</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Bahasa Indonesia</p>
                <p className="text-xs text-muted-foreground">Bahasa utama aplikasi</p>
              </div>
              <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Fitur multi-bahasa akan segera tersedia.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
`;
  const filePath = path.join(__dirname, '..', 'src', 'features', 'settings', 'AppearanceSettings.tsx');
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  const lineCount = content.split('\n').length;
  totalLines += lineCount;
  files.push({ path: filePath, lines: lineCount });
  console.log(`[10/10] Created: ${filePath} (${lineCount} lines)`);
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log('  SUMMARY');
console.log('='.repeat(60));
console.log(`  Total files created : ${files.length}`);
console.log(`  Total lines written : ${totalLines}`);
console.log('='.repeat(60));
console.log('\nAll files created successfully!\n');

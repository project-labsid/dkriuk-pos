import { db } from '@/lib/db'

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
          message: `${product.name} (stok: 0) sudah habis. Segera lakukan pembelian ulang.`,
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
          message: `${product.name} tersisa ${product.stock} ${product.unit} (min: ${product.minStock}).`,
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
    message: `Penjualan ${invoiceNumber} selesai — Rp ${total.toLocaleString('id-ID')}`,
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
    message: `Pembelian ${invoiceNumber} diterima — Rp ${total.toLocaleString('id-ID')}`,
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

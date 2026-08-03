import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { checkAndNotifyLowStock, notifyPurchaseReceived } from '@/lib/notification-service'

const listPurchasesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  supplierId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  costPrice: z.number().min(0),
  total: z.number().min(0),
})

const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier wajib diisi'),
  userId: z.string().min(1, 'User wajib diisi'),
  branchId: z.string().optional(),
  totalAmount: z.number().min(0).default(0),
  status: z.enum(['pending', 'received', 'cancelled']).default('received'),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Minimal 1 item'),
})

function generatePurchaseInvoiceNumber(): string {
  const now = new Date()
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `PO-${dateStr}-${random}`
}

// GET /api/purchases - List purchases with pagination, search, filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = listPurchasesSchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { page, perPage, search, status, supplierId, startDate, endDate } = parsed.data
    const skip = (page - 1) * perPage

    const where: Record<string, unknown> = {}

    if (search) {
      where.invoiceNumber = { contains: search }
    }

    if (status) {
      where.status = status
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate)
      }
      where.createdAt = dateFilter
    }

    const [purchases, total] = await Promise.all([
      db.purchase.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: true } },
          branch: true,
        },
      }),
      db.purchase.count({ where }),
    ])

    return NextResponse.json({
      data: purchases,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    })
  } catch (error) {
    console.error('List purchases error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// POST /api/purchases - Create purchase (updates product stock)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createPurchaseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { items, ...purchaseData } = parsed.data
    const invoiceNumber = generatePurchaseInvoiceNumber()

    const purchase = await db.purchase.create({
      data: {
        ...purchaseData,
        invoiceNumber,
        items: {
          create: items,
        },
      },
      include: {
        supplier: true,
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
        branch: true,
      },
    })

    // Update stock for received purchases
    if (purchaseData.status === 'received') {
      for (const item of items) {
        await db.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            costPrice: item.costPrice,
          },
        })
      }
      // Fire notifications (non-blocking)
      notifyPurchaseReceived(invoiceNumber, purchaseData.totalAmount).catch(() => {})
      checkAndNotifyLowStock().catch(() => {})
    }

    return NextResponse.json({ data: purchase }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create purchase error:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Nomor invoice sudah digunakan' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

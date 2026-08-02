import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const listTransactionsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  paymentMethod: z.string().optional(),
  branchId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const transactionItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().min(1),
  price: z.number().min(0),
  costPrice: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  notes: z.string().optional(),
})

const createTransactionSchema = z.object({
  userId: z.string().min(1, 'User wajib diisi'),
  customerId: z.string().optional(),
  branchId: z.string().optional(),
  type: z.enum(['sale', 'refund']).default('sale'),
  status: z.enum(['pending', 'completed', 'cancelled', 'held']).default('completed'),
  subtotal: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  serviceCharge: z.number().min(0).default(0),
  grandTotal: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  changeAmount: z.number().min(0).default(0),
  paymentMethod: z.string().default('cash'),
  paymentDetails: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(transactionItemSchema).min(1, 'Minimal 1 item'),
})

function generateInvoiceNumber(): string {
  const now = new Date()
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0')
  const timeStr = now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `INV-${dateStr}-${timeStr}-${random}`
}

// GET /api/transactions - List transactions with pagination, search, filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = listTransactionsSchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { page, perPage, search, status, paymentMethod, branchId, startDate, endDate } = parsed.data
    const skip = (page - 1) * perPage

    const where: Record<string, unknown> = {}

    if (search) {
      where.invoiceNumber = { contains: search }
    }

    if (status) {
      where.status = status
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod
    }

    if (branchId) {
      where.branchId = branchId
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

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          customer: true,
          items: true,
          branch: true,
        },
      }),
      db.transaction.count({ where }),
    ])

    return NextResponse.json({
      data: transactions,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    })
  } catch (error) {
    console.error('List transactions error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Create transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createTransactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { items, ...transactionData } = parsed.data
    const invoiceNumber = generateInvoiceNumber()

    // Pre-validate: check user & products exist
    const existingUser = await db.user.findUnique({ where: { id: transactionData.userId }, select: { id: true } })
    if (!existingUser) {
      return NextResponse.json({ error: 'User tidak ditemukan, silakan login ulang' }, { status: 400 })
    }

    const productIds = items.map(i => i.productId)
    const existingProducts = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true } })
    const missingIds = productIds.filter(id => !existingProducts.find(p => p.id === id))
    if (missingIds.length > 0) {
      return NextResponse.json({ error: 'Beberapa produk tidak ditemukan, refresh halaman kasir' }, { status: 400 })
    }

    if (transactionData.customerId) {
      const existingCustomer = await db.customer.findUnique({ where: { id: transactionData.customerId }, select: { id: true } })
      if (!existingCustomer) {
        return NextResponse.json({ error: 'Pelanggan tidak ditemukan' }, { status: 400 })
      }
    }

    const now = new Date()
    const isCompleted = transactionData.status === 'completed'
    const isHeld = transactionData.status === 'held'

    const transaction = await db.transaction.create({
      data: {
        ...transactionData,
        invoiceNumber,
        completedAt: isCompleted ? now : null,
        heldAt: isHeld ? now : null,
        items: {
          create: items,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        customer: true,
        items: true,
        branch: true,
      },
    })

    // Deduct stock for completed sales
    if (isCompleted && transactionData.type === 'sale') {
      for (const item of items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
    }

    // Refund: add stock back
    if (transactionData.type === 'refund' && isCompleted) {
      for (const item of items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    }

    // Add member points for customer
    if (isCompleted && transactionData.customerId && transactionData.type === 'sale') {
      const points = Math.floor(transactionData.grandTotal / 10000)
      if (points > 0) {
        await db.customer.update({
          where: { id: transactionData.customerId },
          data: { memberPoint: { increment: points } },
        })
      }
    }

    return NextResponse.json({ data: transaction }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create transaction error:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Nomor invoice sudah digunakan' },
        { status: 409 }
      )
    }
    // P2003: Foreign key constraint
    if (error && typeof error === 'object' && 'code' in error && (error as {code:string}).code === 'P2003') {
      const meta = (error as {meta?:{modelName?:string;field_name?:string}}).meta
      console.error('FK violation details:', JSON.stringify(meta))
      return NextResponse.json(
        { error: 'Data referensi tidak ditemukan (produk, user, atau pelanggan)' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

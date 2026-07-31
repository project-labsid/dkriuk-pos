import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const listStockSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
  type: z.string().optional(),
  productId: z.string().optional(),
})

const createStockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Produk wajib diisi'),
  userId: z.string().min(1, 'User wajib diisi'),
  branchId: z.string().optional(),
  type: z.enum(['in', 'out', 'adjustment', 'opname']),
  quantity: z.number().int().min(0),
  reason: z.string().optional(),
})

// GET /api/stock - List stock adjustments with pagination, filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = listStockSchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { page, perPage, type, productId } = parsed.data
    const skip = (page - 1) * perPage

    const where: Record<string, unknown> = {}

    if (type) {
      where.type = type
    }

    if (productId) {
      where.productId = productId
    }

    const [adjustments, total] = await Promise.all([
      db.stockAdjustment.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
          user: { select: { id: true, name: true, email: true } },
          branch: true,
        },
      }),
      db.stockAdjustment.count({ where }),
    ])

    return NextResponse.json({
      data: adjustments,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    })
  } catch (error) {
    console.error('List stock adjustments error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// POST /api/stock - Create stock adjustment (updates product stock)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createStockAdjustmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { productId, userId, branchId, type, quantity, reason } = parsed.data

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    const previousStock = product.stock
    let newStock = previousStock

    if (type === 'in') {
      newStock = previousStock + quantity
    } else if (type === 'out') {
      newStock = Math.max(0, previousStock - quantity)
    } else if (type === 'adjustment') {
      newStock = quantity
    } else if (type === 'opname') {
      newStock = quantity
    }

    // Update product stock
    await db.product.update({
      where: { id: productId },
      data: { stock: newStock },
    })

    // Create stock adjustment record
    const adjustment = await db.stockAdjustment.create({
      data: {
        productId,
        userId,
        branchId,
        type,
        quantity,
        previousStock,
        newStock,
        reason,
      },
      include: {
        product: true,
        user: { select: { id: true, name: true, email: true } },
        branch: true,
      },
    })

    return NextResponse.json({ data: adjustment }, { status: 201 })
  } catch (error) {
    console.error('Create stock adjustment error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

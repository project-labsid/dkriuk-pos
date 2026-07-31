import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateTransactionSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled', 'held']).optional(),
  customerId: z.string().nullable().optional(),
  discountAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  serviceCharge: z.number().min(0).optional(),
  grandTotal: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  changeAmount: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  paymentDetails: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/transactions/[id] - Get single transaction with items
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        customer: true,
        items: true,
        branch: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: transaction })
  } catch (error) {
    console.error('Get transaction error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/transactions/[id] - Update transaction
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateTransactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await db.transaction.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = { ...parsed.data }

    // If completing a held transaction
    if (parsed.data.status === 'completed' && existing.status === 'held') {
      updateData.completedAt = new Date()

      // Deduct stock
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // Add member points
      if (existing.customerId && existing.type === 'sale') {
        const points = Math.floor((existing.grandTotal) / 10000)
        if (points > 0) {
          await db.customer.update({
            where: { id: existing.customerId },
            data: { memberPoint: { increment: points } },
          })
        }
      }
    }

    // If cancelling, restore stock
    if (parsed.data.status === 'cancelled' && existing.status === 'completed' && existing.type === 'sale') {
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    }

    const transaction = await db.transaction.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        customer: true,
        items: true,
        branch: true,
      },
    })

    return NextResponse.json({ data: transaction })
  } catch (error) {
    console.error('Update transaction error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

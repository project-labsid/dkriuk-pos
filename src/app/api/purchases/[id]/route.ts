import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updatePurchaseSchema = z.object({
  supplierId: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
  status: z.enum(['pending', 'received', 'cancelled']).optional(),
  notes: z.string().nullable().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/purchases/[id] - Get single purchase
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
        branch: true,
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Pembelian tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: purchase })
  } catch (error) {
    console.error('Get purchase error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/purchases/[id] - Update purchase
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updatePurchaseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await db.purchase.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Pembelian tidak ditemukan' },
        { status: 404 }
      )
    }

    // If receiving a pending purchase, update stock
    if (parsed.data.status === 'received' && existing.status === 'pending') {
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            costPrice: item.costPrice,
          },
        })
      }
    }

    const purchase = await db.purchase.update({
      where: { id },
      data: parsed.data,
      include: {
        supplier: true,
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
        branch: true,
      },
    })

    return NextResponse.json({ data: purchase })
  } catch (error) {
    console.error('Update purchase error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// DELETE /api/purchases/[id] - Delete purchase
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const existing = await db.purchase.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Pembelian tidak ditemukan' },
        { status: 404 }
      )
    }

    // If purchase was received, deduct stock
    if (existing.status === 'received') {
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
    }

    await db.purchase.delete({ where: { id } })

    return NextResponse.json({ message: 'Pembelian berhasil dihapus' })
  } catch (error) {
    console.error('Delete purchase error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

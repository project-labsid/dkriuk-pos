import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const stockOpnameSchema = z.object({
  productId: z.string().min(1, 'Produk wajib diisi'),
  userId: z.string().min(1, 'User wajib diisi'),
  branchId: z.string().optional(),
  actualStock: z.number().int().min(0),
  reason: z.string().optional(),
})

// POST /api/stock/opname - Stock opname: set actual stock count
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = stockOpnameSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { productId, userId, branchId, actualStock, reason } = parsed.data

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    const previousStock = product.stock
    const difference = Math.abs(actualStock - previousStock)

    // Update product stock to actual
    await db.product.update({
      where: { id: productId },
      data: { stock: actualStock },
    })

    // Create stock adjustment record
    const adjustment = await db.stockAdjustment.create({
      data: {
        productId,
        userId,
        branchId,
        type: 'opname',
        quantity: difference,
        previousStock,
        newStock: actualStock,
        reason: reason ?? `Stock opname: sebelum ${previousStock}, sesudah ${actualStock}`,
      },
      include: {
        product: true,
        user: { select: { id: true, name: true, email: true } },
        branch: true,
      },
    })

    return NextResponse.json({ data: adjustment }, { status: 201 })
  } catch (error) {
    console.error('Stock opname error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

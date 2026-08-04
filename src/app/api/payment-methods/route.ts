import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const listPaymentMethodsSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
})

const createPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Nama metode pembayaran wajib diisi'),
  type: z.enum(['cash', 'qris', 'transfer', 'virtual_account', 'ewallet', 'debit', 'credit', 'manual', 'other'], {
    errorMap: () => ({ message: 'Tipe metode pembayaran tidak valid' }),
  }),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  icon: z.string().optional(),
  logo: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
  branch: z.string().optional(),
  swiftCode: z.string().optional(),
  phone: z.string().optional(),
  provider: z.string().optional(),
  merchantId: z.string().optional(),
  merchantName: z.string().optional(),
  qrImage: z.string().optional(),
  instructions: z.string().optional(),
  paymentGateway: z.string().optional(),
  cardProvider: z.string().optional(),
})

const updatePaymentMethodSchema = createPaymentMethodSchema.partial().required({ name: true, type: true })

// GET /api/payment-methods - List all payment methods with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = listPaymentMethodsSchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { type, status, search } = parsed.data

    const where: Record<string, unknown> = {
      deletedAt: null,
    }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { bankName: { contains: search } },
        { accountNumber: { contains: search } },
        { accountHolder: { contains: search } },
        { merchantName: { contains: search } },
      ]
    }

    const paymentMethods = await db.paymentMethod.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({ data: paymentMethods })
  } catch (error) {
    console.error('List payment methods error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// POST /api/payment-methods - Create payment method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createPaymentMethodSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db.paymentMethod.updateMany({
        where: { isDefault: true, deletedAt: null },
        data: { isDefault: false },
      })
    }

    const paymentMethod = await db.paymentMethod.create({
      data,
    })

    return NextResponse.json({ data: paymentMethod }, { status: 201 })
  } catch (error) {
    console.error('Create payment method error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/payment-methods - Update payment method
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID metode pembayaran wajib diisi' },
        { status: 400 }
      )
    }

    const parsed = updatePaymentMethodSchema.safeParse(updateData)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Verify payment method exists and not soft-deleted
    const existing = await db.paymentMethod.findFirst({
      where: { id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Metode pembayaran tidak ditemukan' },
        { status: 404 }
      )
    }

    const data = parsed.data

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db.paymentMethod.updateMany({
        where: { isDefault: true, deletedAt: null, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const paymentMethod = await db.paymentMethod.update({
      where: { id },
      data,
    })

    return NextResponse.json({ data: paymentMethod })
  } catch (error) {
    console.error('Update payment method error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PATCH /api/payment-methods - Batch reorder
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { orders } = body as { orders: { id: string; sortOrder: number }[] }

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: 'Data order tidak valid' },
        { status: 400 }
      )
    }

    await Promise.all(
      orders.map((item) =>
        db.paymentMethod.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reorder payment methods error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// DELETE /api/payment-methods - Soft-delete payment method
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID metode pembayaran wajib diisi' },
        { status: 400 }
      )
    }

    // Verify payment method exists and not already soft-deleted
    const existing = await db.paymentMethod.findFirst({
      where: { id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Metode pembayaran tidak ditemukan' },
        { status: 404 }
      )
    }

    // Soft delete by setting deletedAt
    const paymentMethod = await db.paymentMethod.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDefault: false,
      },
    })

    return NextResponse.json({ data: paymentMethod })
  } catch (error) {
    console.error('Delete payment method error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

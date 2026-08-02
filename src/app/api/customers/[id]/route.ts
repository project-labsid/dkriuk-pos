import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Email tidak valid').nullable().optional(),
  address: z.string().nullable().optional(),
  memberPoint: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/customers/[id] - Get single customer
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const customer = await db.customer.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: customer })
  } catch (error) {
    console.error('Get customer error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateCustomerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await db.customer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }

    const customer = await db.customer.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ data: customer })
  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const existing = await db.customer.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existing._count.transactions > 0) {
      return NextResponse.json(
        { error: 'Pelanggan tidak dapat dihapus karena masih memiliki transaksi' },
        { status: 400 }
      )
    }

    await db.customer.delete({ where: { id } })

    return NextResponse.json({ message: 'Pelanggan berhasil dihapus' })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

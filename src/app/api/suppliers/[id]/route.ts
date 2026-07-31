import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Email tidak valid').nullable().optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/suppliers/[id] - Get single supplier
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchases: true } } },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: supplier })
  } catch (error) {
    console.error('Get supplier error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateSupplierSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await db.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 404 }
      )
    }

    const supplier = await db.supplier.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ data: supplier })
  } catch (error) {
    console.error('Update supplier error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Delete supplier
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const existing = await db.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchases: true } } },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existing._count.purchases > 0) {
      return NextResponse.json(
        { error: 'Supplier tidak dapat dihapus karena masih memiliki pembelian' },
        { status: 400 }
      )
    }

    await db.supplier.delete({ where: { id } })

    return NextResponse.json({ message: 'Supplier berhasil dihapus' })
  } catch (error) {
    console.error('Delete supplier error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

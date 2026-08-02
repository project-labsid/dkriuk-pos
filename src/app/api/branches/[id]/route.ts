import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Email tidak valid').nullable().optional(),
  isActive: z.boolean().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/branches/[id] - Get single branch
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const branch = await db.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            transactions: true,
          },
        },
      },
    })

    if (!branch) {
      return NextResponse.json(
        { error: 'Cabang tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: branch })
  } catch (error) {
    console.error('Get branch error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/branches/[id] - Update branch
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateBranchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await db.branch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Cabang tidak ditemukan' },
        { status: 404 }
      )
    }

    const branch = await db.branch.update({
      where: { id },
      data: parsed.data,
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            transactions: true,
          },
        },
      },
    })

    return NextResponse.json({ data: branch })
  } catch (error) {
    console.error('Update branch error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// DELETE /api/branches/[id] - Delete branch
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const existing = await db.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            transactions: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Cabang tidak ditemukan' },
        { status: 404 }
      )
    }

    const hasRelations =
      existing._count.users > 0 ||
      existing._count.products > 0 ||
      existing._count.transactions > 0

    if (hasRelations) {
      return NextResponse.json(
        { error: 'Cabang tidak dapat dihapus karena masih memiliki data terkait' },
        { status: 400 }
      )
    }

    await db.branch.delete({ where: { id } })

    return NextResponse.json({ message: 'Cabang berhasil dihapus' })
  } catch (error) {
    console.error('Delete branch error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

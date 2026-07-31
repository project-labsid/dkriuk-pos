import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createBranchSchema = z.object({
  name: z.string().min(1, 'Nama cabang wajib diisi'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
})

// GET /api/branches - List branches
export async function GET() {
  try {
    const branches = await db.branch.findMany({
      orderBy: { name: 'asc' },
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

    return NextResponse.json({ data: branches })
  } catch (error) {
    console.error('List branches error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// POST /api/branches - Create branch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createBranchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = {
      ...parsed.data,
      email: parsed.data.email === '' ? null : parsed.data.email,
    }

    const branch = await db.branch.create({ data })

    return NextResponse.json({ data: branch }, { status: 201 })
  } catch (error) {
    console.error('Create branch error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

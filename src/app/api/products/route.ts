import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const listProductsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(500).default(20),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.string().optional(),
  branchId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const createProductSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().default('pcs'),
  costPrice: z.number().min(0).default(0),
  sellPrice: z.number().min(0).default(0),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  image: z.string().optional(),
  branchId: z.string().optional(),
})

// GET /api/products - List products with pagination, search, filter, sorting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = listProductsSchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { page, perPage, search, categoryId, isActive, branchId, sortBy, sortOrder } = parsed.data
    const skip = (page - 1) * perPage

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { sku: { contains: search } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    if (branchId) {
      where.branchId = branchId
    }

    const allowedSortFields = ['name', 'sellPrice', 'costPrice', 'stock', 'createdAt', 'updatedAt']
    const sortField = (allowedSortFields.includes(sortBy ?? '') ? sortBy : 'createdAt') as string
    const orderBy: Record<string, string> = { [sortField]: sortOrder }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        include: { category: true, branch: true },
      }),
      db.product.count({ where }),
    ])

    return NextResponse.json({
      data: products,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    })
  } catch (error) {
    console.error('List products error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const product = await db.product.create({
      data: parsed.data,
      include: { category: true, branch: true },
    })

    return NextResponse.json({ data: product }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create product error:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Barcode atau SKU sudah digunakan' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

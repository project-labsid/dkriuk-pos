import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateTaxSchema = z.object({
  isEnabled: z.boolean().optional(),
  percentage: z.number().min(0).max(100).optional(),
  mode: z.enum(['include', 'exclude']).optional(),
  applyToAll: z.boolean().optional(),
  categoryId: z.string().nullable().optional(),
})

// GET /api/settings/tax - Get tax setting
export async function GET() {
  try {
    const taxSetting = await db.taxSetting.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    })

    if (!taxSetting) {
      return NextResponse.json({
        data: {
          isEnabled: false,
          percentage: 11,
          mode: 'exclude',
          applyToAll: true,
          categoryId: null,
        },
      })
    }

    return NextResponse.json({ data: taxSetting })
  } catch (error) {
    console.error('Get tax setting error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/tax - Update tax setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = updateTaxSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await db.taxSetting.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    let taxSetting
    if (existing) {
      taxSetting = await db.taxSetting.update({
        where: { id: existing.id },
        data: parsed.data,
        include: { category: true },
      })
    } else {
      taxSetting = await db.taxSetting.create({
        data: {
          isEnabled: parsed.data.isEnabled ?? false,
          percentage: parsed.data.percentage ?? 11,
          mode: parsed.data.mode ?? 'exclude',
          applyToAll: parsed.data.applyToAll ?? true,
          categoryId: parsed.data.categoryId ?? null,
        },
        include: { category: true },
      })
    }

    return NextResponse.json({ data: taxSetting })
  } catch (error) {
    console.error('Update tax setting error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

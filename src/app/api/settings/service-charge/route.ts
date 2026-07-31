import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateServiceChargeSchema = z.object({
  isEnabled: z.boolean().optional(),
  percentage: z.number().min(0).max(100).optional(),
})

// GET /api/settings/service-charge - Get service charge setting
export async function GET() {
  try {
    const setting = await db.serviceChargeSetting.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!setting) {
      return NextResponse.json({
        data: {
          isEnabled: false,
          percentage: 5,
        },
      })
    }

    return NextResponse.json({ data: setting })
  } catch (error) {
    console.error('Get service charge setting error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/service-charge - Update service charge setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = updateServiceChargeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await db.serviceChargeSetting.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    let setting
    if (existing) {
      setting = await db.serviceChargeSetting.update({
        where: { id: existing.id },
        data: parsed.data,
      })
    } else {
      setting = await db.serviceChargeSetting.create({
        data: {
          isEnabled: parsed.data.isEnabled ?? false,
          percentage: parsed.data.percentage ?? 5,
        },
      })
    }

    return NextResponse.json({ data: setting })
  } catch (error) {
    console.error('Update service charge setting error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

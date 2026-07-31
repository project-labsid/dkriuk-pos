import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
}).refine((d) => Object.keys(d.settings).length >= 1, {
  message: 'Minimal 1 setting',
  path: ['settings'],
})

// GET /api/settings - Get all store settings as key-value pairs
export async function GET() {
  try {
    const settings = await db.storeSetting.findMany({
      orderBy: { key: 'asc' },
    })

    const keyValuePairs: Record<string, string> = {}
    for (const setting of settings) {
      keyValuePairs[setting.key] = setting.value
    }

    return NextResponse.json({ data: keyValuePairs })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Update store settings (accept key-value pairs object)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = updateSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { settings } = parsed.data

    const results = []
    for (const [key, value] of Object.entries(settings)) {
      const result = await db.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
      results.push(result)
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

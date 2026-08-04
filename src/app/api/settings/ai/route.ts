import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// AI setting keys stored as key-value pairs in StoreSetting
const AI_KEYS = [
  'ai_api_key',
  'ai_model',
  'ai_enabled_features',
] as const

const AI_DEFAULTS: Record<string, string> = {
  ai_api_key: '',
  ai_model: 'gpt-4o-mini',
  ai_enabled_features: JSON.stringify([]),
}

const VALID_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] as const

const VALID_FEATURES = [
  'smart_suggestion',
  'sales_analysis',
  'stock_prediction',
  'auto_categorize',
  'customer_insight',
] as const

const updateAISettingsSchema = z.object({
  ai_api_key: z.string().optional(),
  ai_model: z.enum(VALID_MODELS).optional(),
  ai_enabled_features: z
    .string()
    .optional()
    .refine(
      (val) => {
        try {
          const arr = JSON.parse(val)
          if (!Array.isArray(arr)) return false
          return arr.every((f: string) => (VALID_FEATURES as readonly string[]).includes(f))
        } catch {
          return false
        }
      },
      { message: 'ai_enabled_features harus berupa JSON array yang valid' }
    ),
})

// GET /api/settings/ai - Get all AI settings with defaults, mask API key
export async function GET() {
  try {
    const settings = await db.storeSetting.findMany({
      where: {
        key: { in: [...AI_KEYS] },
      },
      orderBy: { key: 'asc' },
    })

    const result: Record<string, string> = { ...AI_DEFAULTS }
    for (const setting of settings) {
      result[setting.key] = setting.value
    }

    // Mask API key — show only first 8 chars + '****'
    if (result.ai_api_key && result.ai_api_key.length > 8) {
      result.ai_api_key = result.ai_api_key.slice(0, 8) + '****'
    } else if (result.ai_api_key && result.ai_api_key.length > 0) {
      result.ai_api_key = '****'
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Get AI settings error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/ai - Update AI settings (upsert key-value pairs)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = updateAISettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const results = []
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue
      const result = await db.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
      results.push(result)
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Update AI settings error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

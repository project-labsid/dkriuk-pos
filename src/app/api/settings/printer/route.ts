import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// Printer setting keys stored as key-value pairs in StoreSetting
const PRINTER_KEYS = [
  'printer_paper_width',
  'printer_auto_print',
  'printer_copies',
  'printer_header_text',
  'printer_footer_text',
  'printer_show_logo',
] as const

const PRINTER_DEFAULTS: Record<string, string> = {
  printer_paper_width: '80',
  printer_auto_print: 'false',
  printer_copies: '1',
  printer_header_text: '',
  printer_footer_text: '',
  printer_show_logo: 'true',
}

const updatePrinterSettingsSchema = z.object({
  printer_paper_width: z.enum(['58', '80']).optional(),
  printer_auto_print: z.string().optional(),
  printer_copies: z.string().optional(),
  printer_header_text: z.string().optional(),
  printer_footer_text: z.string().optional(),
  printer_show_logo: z.string().optional(),
})

// GET /api/settings/printer - Get all printer settings with defaults
export async function GET() {
  try {
    const settings = await db.storeSetting.findMany({
      where: {
        key: { in: [...PRINTER_KEYS] },
      },
      orderBy: { key: 'asc' },
    })

    const result: Record<string, string> = { ...PRINTER_DEFAULTS }
    for (const setting of settings) {
      result[setting.key] = setting.value
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Get printer settings error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/printer - Update printer settings (upsert key-value pairs)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = updatePrinterSettingsSchema.safeParse(body)

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
    console.error('Update printer settings error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

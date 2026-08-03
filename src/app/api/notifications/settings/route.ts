import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { classifyError } from '@/lib/api-error'

// GET /api/notifications/settings?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json(
        { error: 'userId wajib' },
        { status: 400 }
      )
    }

    let setting = await db.notificationSetting.findUnique({
      where: { userId },
    })

    // Auto-create if not exists
    if (!setting) {
      setting = await db.notificationSetting.create({
        data: { userId },
      })
    }

    return NextResponse.json({ data: setting })
  } catch (error) {
    return classifyError(error)
  }
}

// PUT /api/notifications/settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, ...settings } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId wajib' },
        { status: 400 }
      )
    }

    const setting = await db.notificationSetting.upsert({
      where: { userId },
      create: { userId, ...settings },
      update: settings,
    })

    return NextResponse.json({ data: setting })
  } catch (error) {
    return classifyError(error)
  }
}

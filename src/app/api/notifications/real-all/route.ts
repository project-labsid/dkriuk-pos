import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { classifyError } from '@/lib/api-error'

// PUT /api/notifications/read-all
export async function PUT() {
  try {
    await db.notification.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return classifyError(error)
  }
}

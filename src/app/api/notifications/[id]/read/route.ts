import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { classifyError } from '@/lib/api-error'

// PUT /api/notifications/[id]/read
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const notification = await db.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({ data: notification })
  } catch (error) {
    return classifyError(error)
  }
}

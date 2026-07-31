import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/transactions/held - Get all held transactions for current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Parameter userId wajib diisi' },
        { status: 400 }
      )
    }

    const transactions = await db.transaction.findMany({
      where: {
        userId,
        status: 'held',
      },
      orderBy: { heldAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        customer: true,
        items: true,
        branch: true,
      },
    })

    return NextResponse.json({ data: transactions })
  } catch (error) {
    console.error('List held transactions error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

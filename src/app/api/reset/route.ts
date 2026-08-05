import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
async function performReset(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const preserveUserId = body.preserveUserId as string | undefined
    // Delete in correct order to respect foreign key constraints
    await db.activityLog.deleteMany({})
    await db.stockAdjustment.deleteMany({})
    await db.transactionItem.deleteMany({})
    await db.transaction.deleteMany({})
    await db.purchaseItem.deleteMany({})
    await db.purchase.deleteMany({})
    await db.product.deleteMany({})
    await db.paymentMethod.deleteMany({})
    await db.taxSetting.deleteMany({})
    await db.serviceChargeSetting.deleteMany({})
    await db.storeSetting.deleteMany({})
    await db.customer.deleteMany({})
    await db.supplier.deleteMany({})
    await db.category.deleteMany({})
    await db.branch.deleteMany({})
    if (preserveUserId) {
      await db.user.deleteMany({
        where: { id: { not: preserveUserId } },
      })
      await db.user.update({
        where: { id: preserveUserId },
        data: { role: 'super_admin', branchId: null },
      })
    } else {
      await db.user.deleteMany({})
    }
    return NextResponse.json({
      success: true,
      message: 'Semua data berhasil direset',
    })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json(
      { error: 'Gagal mereset data. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
export async function POST(request: Request) {
  return performReset(request)
}
export async function DELETE(request: Request) {
  return performReset(request)
}

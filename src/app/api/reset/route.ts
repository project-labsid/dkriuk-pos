import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/reset - Reset all data (except current user's account)
export async function DELETE(request: Request) {
  try {
    // Get the user ID from the request body to preserve that user
    const body = await request.json().catch(() => ({}))
    const preserveUserId = body.preserveUserId as string | undefined

    // Delete in correct order to respect foreign key constraints
    // 1. Activity logs
    await db.activityLog.deleteMany({})

    // 2. Stock adjustments
    await db.stockAdjustment.deleteMany({})

    // 3. Transaction items (cascade should handle, but be explicit)
    await db.transactionItem.deleteMany({})

    // 4. Transactions
    await db.transaction.deleteMany({})

    // 5. Purchase items
    await db.purchaseItem.deleteMany({})

    // 6. Purchases
    await db.purchase.deleteMany({})

    // 7. Products
    await db.product.deleteMany({})

    // 8. Tax settings
    await db.taxSetting.deleteMany({})

    // 9. Service charge settings
    await db.serviceChargeSetting.deleteMany({})

    // 10. Store settings
    await db.storeSetting.deleteMany({})

    // 11. Customers
    await db.customer.deleteMany({})

    // 12. Suppliers
    await db.supplier.deleteMany({})

    // 13. Categories
    await db.category.deleteMany({})

    // 14. Branches
    await db.branch.deleteMany({})

    // 15. Users (except the one performing the reset)
    if (preserveUserId) {
      await db.user.deleteMany({
        where: { id: { not: preserveUserId } },
      })
      // Reset the preserved user back to super_admin
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

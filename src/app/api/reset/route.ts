import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE - Reset all data (preserve specified user)
export async function DELETE(request: NextRequest) {
  try {
    const { preserveUserId } = await request.json();

    // Delete in correct order (respect foreign keys)
    await db.transactionItem.deleteMany({});
    await db.purchaseItem.deleteMany({});
    await db.stockAdjustment.deleteMany({});
    await db.transaction.deleteMany({});
    await db.purchase.deleteMany({});
    await db.notification.deleteMany({});
    await db.notificationSetting.deleteMany({});
    await db.activityLog.deleteMany({});
    await db.product.deleteMany({});
    await db.customer.deleteMany({});
    await db.taxSetting.deleteMany({});
    await db.serviceChargeSetting.deleteMany({});
    await db.storeSetting.deleteMany({});
    await db.supplier.deleteMany({});
    await db.category.deleteMany({});

    // Delete non-preserved users
    if (preserveUserId) {
      await db.user.deleteMany({
        where: { id: { not: preserveUserId } },
      });
    } else {
      await db.user.deleteMany({});
    }

    // Keep branches
    // await db.branch.deleteMany({});

    return NextResponse.json({ message: 'Semua data berhasil direset' });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ error: 'Gagal mereset data' }, { status: 500 });
  }
}
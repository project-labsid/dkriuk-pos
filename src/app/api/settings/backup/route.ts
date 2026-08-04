import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings/backup - Export all data as JSON
export async function GET() {
  try {
    const [users, branches, categories, suppliers, customers, products, transactions, transactionItems, purchases, purchaseItems, stockAdjustments, storeSettings, taxSettings, serviceChargeSettings, activityLogs, notifications, notificationSettings] = await Promise.all([
      db.user.findMany({ select: { id: true, name: true, email: true, phone: true, avatar: true, role: true, branchId: true, isActive: true, createdAt: true, updatedAt: true } }),
      db.branch.findMany(),
      db.category.findMany(),
      db.supplier.findMany(),
      db.customer.findMany(),
      db.product.findMany(),
      db.transaction.findMany({ include: { items: true } }),
      db.transactionItem.findMany(),
      db.purchase.findMany(),
      db.purchaseItem.findMany(),
      db.stockAdjustment.findMany(),
      db.storeSetting.findMany(),
      db.taxSetting.findMany(),
      db.serviceChargeSetting.findMany(),
      db.activityLog.findMany(),
      db.notification.findMany(),
      db.notificationSetting.findMany(),
    ])

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appVersion: '0.2.1',
      stats: {
        users: users.length,
        branches: branches.length,
        categories: categories.length,
        suppliers: suppliers.length,
        customers: customers.length,
        products: products.length,
        transactions: transactions.length,
        purchases: purchases.length,
        stockAdjustments: stockAdjustments.length,
      },
      data: {
        users,
        branches,
        categories,
        suppliers,
        customers,
        products,
        transactions,
        transactionItems,
        purchases,
        purchaseItems,
        stockAdjustments,
        storeSettings,
        taxSettings,
        serviceChargeSettings,
        activityLogs,
        notifications,
        notificationSettings,
      },
    }

    return NextResponse.json(backupData)
  } catch (error) {
    console.error('Backup export error:', error)
    return NextResponse.json(
      { error: 'Gagal mengekspor data' },
      { status: 500 }
    )
  }
}

// POST /api/settings/backup - Import data from JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, options = {} } = body

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Format data tidak valid' },
        { status: 400 }
      )
    }

    const replaceAll = options.replaceAll === true
    const importedOnly = options.importedOnly === true
    const modules: string[] = options.modules || []

    let importCount = 0

    // Import categories (must be before products for FK)
    if (data.categories && (modules.length === 0 || modules.includes('categories'))) {
      if (replaceAll) {
        await db.category.deleteMany()
      }
      for (const cat of data.categories) {
        const { id, ...rest } = cat
        await db.category.create({ data: rest })
        importCount++
      }
    }

    // Import branches (must be before users for FK)
    if (data.branches && (modules.length === 0 || modules.includes('branches'))) {
      if (replaceAll) {
        await db.branch.deleteMany()
      }
      for (const branch of data.branches) {
        const { id, ...rest } = branch
        await db.branch.create({ data: rest })
        importCount++
      }
    }

    // Import suppliers
    if (data.suppliers && (modules.length === 0 || modules.includes('suppliers'))) {
      if (replaceAll) {
        await db.supplier.deleteMany()
      }
      for (const sup of data.suppliers) {
        const { id, ...rest } = sup
        await db.supplier.create({ data: rest })
        importCount++
      }
    }

    // Import customers
    if (data.customers && (modules.length === 0 || modules.includes('customers'))) {
      if (replaceAll) {
        await db.customer.deleteMany()
      }
      for (const cust of data.customers) {
        const { id, ...rest } = cust
        await db.customer.create({ data: rest })
        importCount++
      }
    }

    // Import products
    if (data.products && (modules.length === 0 || modules.includes('products'))) {
      if (replaceAll) {
        await db.stockAdjustment.deleteMany({ where: { product: {} } })
        await db.transactionItem.deleteMany({ where: { product: {} } })
        await db.purchaseItem.deleteMany({ where: { product: {} } })
        await db.product.deleteMany()
      }
      for (const prod of data.products) {
        const { id, ...rest } = prod
        await db.product.create({ data: rest })
        importCount++
      }
    }

    // Import users (skip if importedOnly - don't overwrite passwords)
    if (data.users && !importedOnly && (modules.length === 0 || modules.includes('users'))) {
      if (replaceAll) {
        await db.user.deleteMany()
      }
      for (const usr of data.users) {
        const { id, ...rest } = usr
        await db.user.create({ data: rest })
        importCount++
      }
    }

    // Import store settings
    if (data.storeSettings && (modules.length === 0 || modules.includes('settings'))) {
      if (replaceAll) {
        await db.storeSetting.deleteMany()
      }
      for (const setting of data.storeSettings) {
        const { id, ...rest } = setting
        await db.storeSetting.upsert({
          where: { key: rest.key },
          update: { value: rest.value, description: rest.description },
          create: rest,
        })
        importCount++
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: importCount,
      message: `${importCount} data berhasil diimpor`,
    })
  } catch (error) {
    console.error('Backup import error:', error)
    return NextResponse.json(
      { error: 'Gagal mengimpor data. Pastikan format file benar.' },
      { status: 500 }
    )
  }
}

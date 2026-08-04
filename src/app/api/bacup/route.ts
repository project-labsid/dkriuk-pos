import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackupData {
  exportedAt: string
  version: string
  tables: {
    branches: Record<string, unknown>[]
    categories: Record<string, unknown>[]
    suppliers: Record<string, unknown>[]
    customers: Record<string, unknown>[]
    users: Record<string, unknown>[]
    products: Record<string, unknown>[]
    taxSettings: Record<string, unknown>[]
    serviceChargeSettings: Record<string, unknown>[]
    storeSettings: Record<string, unknown>[]
    transactions: Record<string, unknown>[]
    purchases: Record<string, unknown>[]
    stockAdjustments: Record<string, unknown>[]
  }
}

// ─── Zod schema for import validation ─────────────────────────────────────────

const backupImportSchema = z.object({
  data: z.object({
    exportedAt: z.string(),
    version: z.string(),
    tables: z.object({
      branches: z.array(z.record(z.unknown())),
      categories: z.array(z.record(z.unknown())),
      suppliers: z.array(z.record(z.unknown())),
      customers: z.array(z.record(z.unknown())),
      users: z.array(z.record(z.unknown())),
      products: z.array(z.record(z.unknown())),
      taxSettings: z.array(z.record(z.unknown())),
      serviceChargeSettings: z.array(z.record(z.unknown())),
      storeSettings: z.array(z.record(z.unknown())),
      transactions: z.array(z.record(z.unknown())),
      purchases: z.array(z.record(z.unknown())),
      stockAdjustments: z.array(z.record(z.unknown())),
    }),
  }),
})

// ─── GET /api/backup ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statsOnly = searchParams.get('stats') === 'true'

    // ── Stats mode: return counts only ──
    if (statsOnly) {
      const [
        totalProducts,
        totalTransactions,
        totalCustomers,
        totalPurchases,
        totalCategories,
        totalSuppliers,
        totalBranches,
        totalUsers,
        totalStockAdjustments,
      ] = await Promise.all([
        db.product.count(),
        db.transaction.count(),
        db.customer.count(),
        db.purchase.count(),
        db.category.count(),
        db.supplier.count(),
        db.branch.count(),
        db.user.count(),
        db.stockAdjustment.count(),
      ])

      return NextResponse.json({
        data: {
          totalProducts,
          totalTransactions,
          totalCustomers,
          totalPurchases,
          totalCategories,
          totalSuppliers,
          totalBranches,
          totalUsers,
          totalStockAdjustments,
          dbSize: 'estimated',
        },
      })
    }

    // ── Full export mode ──
    const [
      branches,
      categories,
      suppliers,
      customers,
      users,
      products,
      taxSettings,
      serviceChargeSettings,
      storeSettings,
      transactions,
      purchases,
      stockAdjustments,
    ] = await Promise.all([
      db.branch.findMany(),
      db.category.findMany(),
      db.supplier.findMany(),
      db.customer.findMany(),
      db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          branchId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Explicitly exclude password
          password: false,
        },
      }),
      db.product.findMany(),
      db.taxSetting.findMany(),
      db.serviceChargeSetting.findMany(),
      db.storeSetting.findMany(),
      db.transaction.findMany({
        include: { items: true },
      }),
      db.purchase.findMany({
        include: { items: true },
      }),
      db.stockAdjustment.findMany(),
    ])

    const backupData: BackupData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      tables: {
        branches: branches as unknown as Record<string, unknown>[],
        categories: categories as unknown as Record<string, unknown>[],
        suppliers: suppliers as unknown as Record<string, unknown>[],
        customers: customers as unknown as Record<string, unknown>[],
        users: users as unknown as Record<string, unknown>[],
        products: products as unknown as Record<string, unknown>[],
        taxSettings: taxSettings as unknown as Record<string, unknown>[],
        serviceChargeSettings: serviceChargeSettings as unknown as Record<string, unknown>[],
        storeSettings: storeSettings as unknown as Record<string, unknown>[],
        transactions: transactions as unknown as Record<string, unknown>[],
        purchases: purchases as unknown as Record<string, unknown>[],
        stockAdjustments: stockAdjustments as unknown as Record<string, unknown>[],
      },
    }

    return NextResponse.json({ data: backupData })
  } catch (error) {
    console.error('Backup export error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Gagal mengekspor data', details: message },
      { status: 500 }
    )
  }
}

// ─── POST /api/backup ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the backup data structure
    const parsed = backupImportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Format file backup tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { tables } = parsed.data.data

    // Perform the entire import in a transaction
    const counts = await db.$transaction(async (tx) => {
      // ── 1. Delete existing data in reverse dependency order ──
      await tx.activityLog.deleteMany({})
      await tx.stockAdjustment.deleteMany({})
      await tx.transactionItem.deleteMany({})
      await tx.transaction.deleteMany({})
      await tx.purchaseItem.deleteMany({})
      await tx.purchase.deleteMany({})
      await tx.product.deleteMany({})
      await tx.customer.deleteMany({})
      await tx.supplier.deleteMany({})
      await tx.category.deleteMany({})
      await tx.branch.deleteMany({})
      await tx.user.deleteMany({})
      await tx.serviceChargeSetting.deleteMany({})
      await tx.taxSetting.deleteMany({})
      await tx.storeSetting.deleteMany({})

      // ── 2. Insert base entities ──
      if (tables.branches.length > 0) {
        await tx.branch.createMany({ data: tables.branches as any })
      }
      if (tables.categories.length > 0) {
        await tx.category.createMany({ data: tables.categories as any })
      }
      if (tables.suppliers.length > 0) {
        await tx.supplier.createMany({ data: tables.suppliers as any })
      }
      if (tables.customers.length > 0) {
        await tx.customer.createMany({ data: tables.customers as any })
      }
      // Users: restore with a default password since passwords are not exported
      if (tables.users.length > 0) {
        // We need to import each user individually because password is required
        for (const user of tables.users) {
          const { id, name, email, phone, avatar, role, branchId, isActive, createdAt, updatedAt } = user as any
          await tx.user.create({
            data: {
              id,
              name,
              email,
              password: 'changeme123', // Default password, users must change it
              phone,
              avatar,
              role,
              branchId,
              isActive,
              createdAt: createdAt ? new Date(createdAt) : undefined,
              updatedAt: updatedAt ? new Date(updatedAt) : undefined,
            },
          })
        }
      }
      if (tables.products.length > 0) {
        await tx.product.createMany({ data: tables.products as any })
      }

      // ── 3. Insert settings ──
      if (tables.taxSettings.length > 0) {
        await tx.taxSetting.createMany({ data: tables.taxSettings as any })
      }
      if (tables.serviceChargeSettings.length > 0) {
        await tx.serviceChargeSetting.createMany({ data: tables.serviceChargeSettings as any })
      }
      if (tables.storeSettings.length > 0) {
        await tx.storeSetting.createMany({ data: tables.storeSettings as any })
      }

      // ── 4. Insert transactions with items ──
      for (const txData of tables.transactions) {
        const { items, ...txFields } = txData as any
        await tx.transaction.create({
          data: {
            ...txFields,
            createdAt: txFields.createdAt ? new Date(txFields.createdAt) : undefined,
            updatedAt: txFields.updatedAt ? new Date(txFields.updatedAt) : undefined,
            completedAt: txFields.completedAt ? new Date(txFields.completedAt) : null,
            heldAt: txFields.heldAt ? new Date(txFields.heldAt) : null,
            items: {
              create: (items || []).map((item: any) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                costPrice: item.costPrice,
                discount: item.discount,
                total: item.total,
                notes: item.notes,
                createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
              })),
            },
          },
        })
      }

      // ── 5. Insert purchases with items ──
      for (const poData of tables.purchases) {
        const { items, ...poFields } = poData as any
        await tx.purchase.create({
          data: {
            ...poFields,
            createdAt: poFields.createdAt ? new Date(poFields.createdAt) : undefined,
            updatedAt: poFields.updatedAt ? new Date(poFields.updatedAt) : undefined,
            items: {
              create: (items || []).map((item: any) => ({
                id: item.id,
                productId: item.productId,
                quantity: item.quantity,
                costPrice: item.costPrice,
                total: item.total,
                createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
              })),
            },
          },
        })
      }

      // ── 6. Insert stock adjustments ──
      if (tables.stockAdjustments.length > 0) {
        await tx.stockAdjustment.createMany({ data: tables.stockAdjustments as any })
      }

      return {
        branches: tables.branches.length,
        categories: tables.categories.length,
        suppliers: tables.suppliers.length,
        customers: tables.customers.length,
        users: tables.users.length,
        products: tables.products.length,
        taxSettings: tables.taxSettings.length,
        serviceChargeSettings: tables.serviceChargeSettings.length,
        storeSettings: tables.storeSettings.length,
        transactions: tables.transactions.length,
        purchases: tables.purchases.length,
        stockAdjustments: tables.stockAdjustments.length,
      }
    })

    return NextResponse.json({
      data: {
        message: 'Data berhasil diimpor. Semua password pengguna diatur ulang ke "changeme123".',
        counts,
      },
    })
  } catch (error) {
    console.error('Backup import error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Gagal mengimpor data', details: message },
      { status: 500 }
    )
  }
}

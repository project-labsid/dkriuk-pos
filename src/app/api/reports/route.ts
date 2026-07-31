import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const reportQuerySchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'best_selling', 'profit_loss', 'customer', 'supplier', 'stock']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  branchId: z.string().optional(),
})

function getDateRange(type: string): { startDate: Date; endDate: Date; groupFormat: string } {
  const now = new Date()
  const endDate = new Date()
  const startDate = new Date()

  switch (type) {
    case 'daily': {
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      return { startDate, endDate, groupFormat: 'daily' }
    }
    case 'weekly': {
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday as start
      startDate.setDate(now.getDate() - diff)
      startDate.setHours(0, 0, 0, 0)
      return { startDate, endDate, groupFormat: 'daily' }
    }
    case 'monthly': {
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      return { startDate, endDate, groupFormat: 'daily' }
    }
    case 'yearly': {
      startDate.setMonth(0, 1)
      startDate.setHours(0, 0, 0, 0)
      return { startDate, endDate, groupFormat: 'monthly' }
    }
    default: {
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      return { startDate, endDate, groupFormat: 'daily' }
    }
  }
}

// GET /api/reports - Generate report data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = reportQuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { type, startDate: queryStart, endDate: queryEnd, branchId } = parsed.data

    const { startDate, endDate } = getDateRange(type)
    const start = queryStart ? new Date(queryStart) : startDate
    const end = queryEnd ? new Date(queryEnd) : endDate

    const baseWhere: Record<string, unknown> = {
      status: 'completed',
      type: 'sale',
      createdAt: { gte: start, lte: end },
    }

    if (branchId) {
      baseWhere.branchId = branchId
    }

    switch (type) {
      case 'daily':
      case 'weekly':
      case 'monthly':
      case 'yearly': {
        const transactions = await db.transaction.findMany({
          where: baseWhere,
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true } },
            items: true,
          },
        })

        const totalSales = transactions.reduce((sum, tx) => sum + tx.grandTotal, 0)
        const totalDiscount = transactions.reduce((sum, tx) => sum + tx.discountAmount, 0)
        const totalTax = transactions.reduce((sum, tx) => sum + tx.taxAmount, 0)
        const totalCost = transactions.reduce(
          (sum, tx) => sum + tx.items.reduce((itemSum, item) => itemSum + (item.costPrice * item.quantity), 0),
          0
        )

        return NextResponse.json({
          data: {
            type,
            startDate: start,
            endDate: end,
            summary: {
              totalTransactions: transactions.length,
              totalSales,
              totalDiscount,
              totalTax,
              totalCost,
              grossProfit: totalSales - totalCost,
            },
            transactions,
          },
        })
      }

      case 'best_selling': {
        const topProducts = await db.transactionItem.groupBy({
          by: ['productId', 'productName'],
          where: {
            transaction: {
              status: 'completed',
              type: 'sale',
              createdAt: { gte: start, lte: end },
              ...(branchId ? { branchId } : {}),
            },
          },
          _sum: {
            quantity: true,
            total: true,
          },
          _count: true,
          orderBy: { _sum: { quantity: 'desc' } },
          take: 20,
        })

        return NextResponse.json({
          data: {
            type,
            startDate: start,
            endDate: end,
            topProducts: topProducts.map((p) => ({
              productId: p.productId,
              productName: p.productName,
              totalQuantity: p._sum.quantity ?? 0,
              totalRevenue: p._sum.total ?? 0,
              orderCount: p._count,
            })),
          },
        })
      }

      case 'profit_loss': {
        const transactions = await db.transaction.findMany({
          where: baseWhere,
          include: { items: true },
        })

        const totalRevenue = transactions.reduce((sum, tx) => sum + tx.grandTotal, 0)
        const totalCost = transactions.reduce(
          (sum, tx) => sum + tx.items.reduce((s, item) => s + (item.costPrice * item.quantity), 0),
          0
        )
        const totalDiscount = transactions.reduce((sum, tx) => sum + tx.discountAmount, 0)
        const totalTax = transactions.reduce((sum, tx) => sum + tx.taxAmount, 0)
        const totalServiceCharge = transactions.reduce((sum, tx) => sum + tx.serviceCharge, 0)

        return NextResponse.json({
          data: {
            type,
            startDate: start,
            endDate: end,
            revenue: totalRevenue,
            costOfGoodsSold: totalCost,
            grossProfit: totalRevenue - totalCost,
            totalDiscount,
            totalTax,
            totalServiceCharge,
            netProfit: totalRevenue - totalCost,
            transactionCount: transactions.length,
          },
        })
      }

      case 'customer': {
        const customerStats = await db.transaction.groupBy({
          by: ['customerId'],
          where: {
            ...baseWhere,
            customerId: { not: null },
          },
          _sum: { grandTotal: true },
          _count: true,
          orderBy: { _sum: { grandTotal: 'desc' } },
          take: 20,
        })

        const customers = await Promise.all(
          customerStats.map(async (stat) => {
            const customer = await db.customer.findUnique({
              where: { id: stat.customerId! },
            })
            return {
              customerId: stat.customerId,
              customerName: customer?.name ?? 'Unknown',
              totalSpent: stat._sum.grandTotal ?? 0,
              transactionCount: stat._count,
            }
          })
        )

        return NextResponse.json({
          data: {
            type,
            startDate: start,
            endDate: end,
            customers,
          },
        })
      }

      case 'supplier': {
        const purchaseStats = await db.purchase.groupBy({
          by: ['supplierId'],
          where: {
            status: 'received',
            createdAt: { gte: start, lte: end },
          },
          _sum: { totalAmount: true },
          _count: true,
          orderBy: { _sum: { totalAmount: 'desc' } },
        })

        const suppliers = await Promise.all(
          purchaseStats.map(async (stat) => {
            const supplier = await db.supplier.findUnique({
              where: { id: stat.supplierId },
            })
            return {
              supplierId: stat.supplierId,
              supplierName: supplier?.name ?? 'Unknown',
              totalPurchased: stat._sum.totalAmount ?? 0,
              purchaseCount: stat._count,
            }
          })
        )

        return NextResponse.json({
          data: {
            type,
            startDate: start,
            endDate: end,
            suppliers,
          },
        })
      }

      case 'stock': {
        const products = await db.product.findMany({
          where: { isActive: true },
          orderBy: { stock: 'asc' },
          include: { category: true },
        })

        const stockValue = products.reduce(
          (sum, p) => sum + (p.stock * p.costPrice),
          0
        )

        const lowStock = products.filter((p) => p.stock <= p.minStock)

        return NextResponse.json({
          data: {
            type,
            totalProducts: products.length,
            totalStockItems: products.reduce((sum, p) => sum + p.stock, 0),
            totalStockValue: stockValue,
            lowStockCount: lowStock.length,
            lowStockProducts: lowStock,
            products: products.map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              category: p.category?.name ?? null,
              stock: p.stock,
              minStock: p.minStock,
              costPrice: p.costPrice,
              sellPrice: p.sellPrice,
              stockValue: p.stock * p.costPrice,
            })),
          },
        })
      }

      default:
        return NextResponse.json(
          { error: 'Tipe laporan tidak valid' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

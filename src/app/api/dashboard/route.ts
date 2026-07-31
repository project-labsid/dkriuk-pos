import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/dashboard - Return dashboard statistics
export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // Run all independent queries in parallel
    const [
      todaySalesResult,
      monthSalesResult,
      totalRevenueResult,
      totalProducts,
      totalCustomers,
      totalSuppliers,
      totalTransactions,
      topProducts,
      recentTransactions,
      lowStockProducts,
      salesChartData,
    ] = await Promise.all([
      // Today's sales (sum of today's completed transactions)
      db.transaction.aggregate({
        where: {
          status: 'completed',
          type: 'sale',
          createdAt: { gte: today },
        },
        _sum: { grandTotal: true },
        _count: true,
      }),

      // Month's sales
      db.transaction.aggregate({
        where: {
          status: 'completed',
          type: 'sale',
          createdAt: { gte: startOfMonth },
        },
        _sum: { grandTotal: true },
        _count: true,
      }),

      // Total revenue (all completed sales)
      db.transaction.aggregate({
        where: {
          status: 'completed',
          type: 'sale',
        },
        _sum: { grandTotal: true },
      }),

      // Total active products
      db.product.count({ where: { isActive: true } }),

      // Total active customers
      db.customer.count({ where: { isActive: true } }),

      // Total active suppliers
      db.supplier.count({ where: { isActive: true } }),

      // Total transactions
      db.transaction.count(),

      // Top 5 selling products by quantity
      db.transactionItem.groupBy({
        by: ['productId', 'productName'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // Recent 10 transactions
      db.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),

      // Low stock products (preliminary filter, refined in JS for stock <= minStock)
      db.product.findMany({
        where: {
          isActive: true,
        },
        take: 50,
        orderBy: { stock: 'asc' },
        include: { category: true },
      }),

      // Sales chart data - daily sales for last 30 days
      db.transaction.findMany({
        where: {
          status: 'completed',
          type: 'sale',
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          createdAt: true,
          grandTotal: true,
        },
      }),

    ])

    // Process sales/revenue chart data - group by date
    const dailyMap = new Map<string, { total: number; count: number }>()
    const transactionsForChart = salesChartData

    for (const tx of transactionsForChart) {
      const dateStr = tx.createdAt.toISOString().split('T')[0]
      const existing = dailyMap.get(dateStr)
      if (existing) {
        existing.total += tx.grandTotal
        existing.count += 1
      } else {
        dailyMap.set(dateStr, { total: tx.grandTotal, count: 1 })
      }
    }

    // Fill in missing dates for last 30 days
    const chartData: Array<{ date: string; total: number }> = []
    const forDate = new Date(thirtyDaysAgo)
    while (forDate <= today) {
      const dateStr = forDate.toISOString().split('T')[0]
      const dayData = dailyMap.get(dateStr)
      chartData.push({
        date: dateStr,
        total: dayData?.total ?? 0,
      })
      forDate.setDate(forDate.getDate() + 1)
    }

    // Filter low stock products where stock <= minStock (do in JS since SQLite limitation)
    const filteredLowStock = lowStockProducts.filter(
      (p) => p.stock <= p.minStock
    )

    return NextResponse.json({
      data: {
        todaySales: todaySalesResult._sum.grandTotal ?? 0,
        todayTransactions: todaySalesResult._count,
        monthSales: monthSalesResult._sum.grandTotal ?? 0,
        monthTransactions: monthSalesResult._count,
        totalRevenue: totalRevenueResult._sum.grandTotal ?? 0,
        totalProducts,
        totalCustomers,
        totalSuppliers,
        totalTransactions,
        topProducts,
        recentTransactions,
        lowStockProducts: filteredLowStock,
        salesChartData: chartData,
        revenueChartData: chartData,
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

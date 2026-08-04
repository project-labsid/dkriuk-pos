import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Export all data as JSON
export async function GET() {
  try {
    const [users, branches, categories, suppliers, customers, products, transactions, transactionItems, purchases, purchaseItems, stockAdjustments, taxSettings, serviceChargeSettings, storeSettings] = await Promise.all([
      db.user.findMany({ include: { branch: true } }),
      db.branch.findMany(),
      db.category.findMany(),
      db.supplier.findMany(),
      db.customer.findMany(),
      db.product.findMany(),
      db.transaction.findMany({ include: { items: true } }),
      db.transactionItem.findMany(),
      db.purchase.findMany({ include: { items: true } }),
      db.purchaseItem.findMany(),
      db.stockAdjustment.findMany(),
      db.taxSetting.findMany(),
      db.serviceChargeSetting.findMany(),
      db.storeSetting.findMany(),
    ]);

    const stats = {
      users: users.length,
      branches: branches.length,
      categories: categories.length,
      suppliers: suppliers.length,
      customers: customers.length,
      products: products.length,
      transactions: transactions.length,
      purchases: purchases.length,
      stockAdjustments: stockAdjustments.length,
    };

    return NextResponse.json({
      data: { users, branches, categories, suppliers, customers, products, transactions, transactionItems, purchases, purchaseItems, stockAdjustments, taxSettings, serviceChargeSettings, storeSettings },
      stats,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Gagal mengekspor data' }, { status: 500 });
  }
}

// POST - Import data from JSON backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, options } = body;

    if (!data) {
      return NextResponse.json({ error: 'Data backup tidak ditemukan' }, { status: 400 });
    }

    const imported: string[] = [];
    const counts: Record<string, number> = {};

    // Import store settings
    if (data.storeSettings && Array.isArray(data.storeSettings)) {
      for (const setting of data.storeSettings) {
        await db.storeSetting.upsert({
          where: { key: setting.key },
          update: { value: setting.value, description: setting.description },
          create: { key: setting.key, value: setting.value, description: setting.description },
        });
      }
      counts.storeSettings = data.storeSettings.length;
      imported.push('storeSettings');
    }

    // Import categories
    if (data.categories && Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        await db.category.upsert({
          where: { id: cat.id },
          update: { name: cat.name, description: cat.description, isActive: cat.isActive },
          create: { id: cat.id, name: cat.name, description: cat.description, isActive: cat.isActive },
        });
      }
      counts.categories = data.categories.length;
      imported.push('categories');
    }

    // Import suppliers
    if (data.suppliers && Array.isArray(data.suppliers)) {
      for (const sup of data.suppliers) {
        await db.supplier.upsert({
          where: { id: sup.id },
          update: { name: sup.name, phone: sup.phone, email: sup.email, address: sup.address, isActive: sup.isActive },
          create: { id: sup.id, name: sup.name, phone: sup.phone, email: sup.email, address: sup.address, isActive: sup.isActive },
        });
      }
      counts.suppliers = data.suppliers.length;
      imported.push('suppliers');
    }

    // Import customers
    if (data.customers && Array.isArray(data.customers)) {
      for (const cust of data.customers) {
        await db.customer.upsert({
          where: { id: cust.id },
          update: { name: cust.name, phone: cust.phone, email: cust.email, address: cust.address, memberPoint: cust.memberPoint, isActive: cust.isActive },
          create: { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email, address: cust.address, memberPoint: cust.memberPoint, isActive: cust.isActive },
        });
      }
      counts.customers = data.customers.length;
      imported.push('customers');
    }

    // Import products
    if (data.products && Array.isArray(data.products)) {
      for (const prod of data.products) {
        await db.product.upsert({
          where: { id: prod.id },
          update: { name: prod.name, barcode: prod.barcode, sku: prod.sku, categoryId: prod.categoryId, unit: prod.unit, costPrice: prod.costPrice, sellPrice: prod.sellPrice, stock: prod.stock, minStock: prod.minStock, image: prod.image, isActive: prod.isActive, branchId: prod.branchId },
          create: { id: prod.id, name: prod.name, barcode: prod.barcode, sku: prod.sku, categoryId: prod.categoryId, unit: prod.unit, costPrice: prod.costPrice, sellPrice: prod.sellPrice, stock: prod.stock, minStock: prod.minStock, image: prod.image, isActive: prod.isActive, branchId: prod.branchId },
        });
      }
      counts.products = data.products.length;
      imported.push('products');
    }

    return NextResponse.json({
      message: `Import berhasil: ${imported.join(', ')}`,
      counts,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Gagal mengimpor data' }, { status: 500 });
  }
}
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals = 0) {
  const val = Math.random() * (max - min) + min
  return Number(val.toFixed(decimals))
}

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await prisma.activityLog.deleteMany()
  await prisma.transactionItem.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.purchaseItem.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.stockAdjustment.deleteMany()
  await prisma.serviceChargeSetting.deleteMany()
  await prisma.taxSetting.deleteMany()
  await prisma.storeSetting.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
  await prisma.branch.deleteMany()

  // ==================== 1. BRANCHES ====================
  console.log('📁 Creating branches...')
  const branchPusat = await prisma.branch.create({
    data: {
      name: 'Pusat',
      address: 'Jl. Merdeka No. 1, Jakarta Pusat',
      phone: '021-1234567',
      email: 'pusat@tokosejahtera.com',
    },
  })

  const branchCabang1 = await prisma.branch.create({
    data: {
      name: 'Cabang 1',
      address: 'Jl. Sudirman No. 45, Jakarta Selatan',
      phone: '021-7654321',
      email: 'cabang1@tokosejahtera.com',
    },
  })

  console.log(`  ✅ Created 2 branches`)

  // ==================== 2. DEFAULT SUPER ADMIN ====================
  console.log('👤 Creating default super admin...')
  const hashedAdminPassword = await bcrypt.hash('admin123', 10)
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@pos.com',
      password: hashedAdminPassword,
      role: 'super_admin',
      branchId: branchPusat.id,
      phone: '081234567890',
    },
  })

  // Create additional users
  const adminPassword = await bcrypt.hash('admin123', 10)
  const cashierPassword = await bcrypt.hash('cashier123', 10)

  const adminUser = await prisma.user.create({
    data: {
      name: 'Rina Wijaya',
      email: 'rina@pos.com',
      password: adminPassword,
      role: 'admin',
      branchId: branchPusat.id,
      phone: '081298765432',
    },
  })

  const cashier1 = await prisma.user.create({
    data: {
      name: 'Budi Santoso',
      email: 'budi@pos.com',
      password: cashierPassword,
      role: 'cashier',
      branchId: branchPusat.id,
      phone: '082112345678',
    },
  })

  const cashier2 = await prisma.user.create({
    data: {
      name: 'Siti Aminah',
      email: 'siti@pos.com',
      password: cashierPassword,
      role: 'cashier',
      branchId: branchCabang1.id,
      phone: '082298765432',
    },
  })

  console.log(`  ✅ Created 4 users (1 super_admin, 1 admin, 2 cashiers)`)

  // ==================== 3. CATEGORIES ====================
  console.log('🏷️ Creating categories...')
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Makanan', description: 'Berbagai jenis makanan' } }),
    prisma.category.create({ data: { name: 'Minuman', description: 'Berbagai jenis minuman' } }),
    prisma.category.create({ data: { name: 'Snack', description: 'Camilan dan makanan ringan' } }),
    prisma.category.create({ data: { name: 'Dessert', description: 'Makanan penutup' } }),
    prisma.category.create({ data: { name: 'Lainnya', description: 'Produk lainnya' } }),
  ])

  console.log(`  ✅ Created ${categories.length} categories`)

  // ==================== 4. SUPPLIERS ====================
  console.log('🚚 Creating suppliers...')
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'PT Food Supply',
        phone: '021-5551234',
        email: 'order@foodsupply.co.id',
        address: 'Jl. Industri No. 10, Bekasi',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'CV Beverage Indo',
        phone: '021-5555678',
        email: 'sales@beverageindo.co.id',
        address: 'Jl. Raya Bogor No. 25, Depok',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'UD Snack Jaya',
        phone: '021-5559012',
        email: 'info@snackjaya.co.id',
        address: 'Jl. Pasar Baru No. 8, Tangerang',
      },
    }),
  ])

  console.log(`  ✅ Created ${suppliers.length} suppliers`)

  // ==================== 5. CUSTOMERS ====================
  console.log('👥 Creating customers...')
  const customers = await Promise.all([
    prisma.customer.create({
      data: { name: 'Pak Ahmad', phone: '081311122233', memberPoint: 1500, address: 'Jl. Kenangan No. 3' },
    }),
    prisma.customer.create({
      data: { name: 'Bu Dewi', phone: '081344455566', memberPoint: 3200, email: 'dewi@email.com' },
    }),
    prisma.customer.create({
      data: { name: 'Andi Pratama', phone: '081577788899', memberPoint: 0 },
    }),
    prisma.customer.create({
      data: { name: 'Maya Sari', phone: '081600011122', memberPoint: 8700, email: 'maya@email.com', address: 'Jl. Harmoni No. 15' },
    }),
    prisma.customer.create({
      data: { name: 'Riko Fadillah', phone: '081733344455', memberPoint: 450 },
    }),
  ])

  console.log(`  ✅ Created ${customers.length} customers`)

  // ==================== 6. PRODUCTS ====================
  console.log('📦 Creating products...')
  const products = await Promise.all([
    // Makanan (8 products)
    prisma.product.create({
      data: {
        name: 'Nasi Goreng Spesial',
        sku: 'MKN-001',
        barcode: '8991234001',
        categoryId: categories[0].id,
        unit: 'porsi',
        costPrice: 12000,
        sellPrice: 25000,
        stock: 50,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mie Ayam Bakso',
        sku: 'MKN-002',
        barcode: '8991234002',
        categoryId: categories[0].id,
        unit: 'porsi',
        costPrice: 10000,
        sellPrice: 22000,
        stock: 40,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Ayam Geprek',
        sku: 'MKN-003',
        barcode: '8991234003',
        categoryId: categories[0].id,
        unit: 'porsi',
        costPrice: 14000,
        sellPrice: 28000,
        stock: 35,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Sate Ayam (10 tusuk)',
        sku: 'MKN-004',
        barcode: '8991234004',
        categoryId: categories[0].id,
        unit: 'porsi',
        costPrice: 18000,
        sellPrice: 35000,
        stock: 25,
        minStock: 5,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Bakso Urat',
        sku: 'MKN-005',
        barcode: '8991234005',
        categoryId: categories[0].id,
        unit: 'porsi',
        costPrice: 8000,
        sellPrice: 18000,
        stock: 60,
        minStock: 15,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Nasi Padang Rendang',
        sku: 'MKN-006',
        barcode: '8991234006',
        categoryId: categories[0].id,
        unit: 'porsi',
        costPrice: 20000,
        sellPrice: 40000,
        stock: 20,
        minStock: 5,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Gado-Gado',
        sku: 'MKN-007',
        barcode: '8991234007',
        categoryId: categories[0].id,
        unit: 'porsi',
        costPrice: 9000,
        sellPrice: 20000,
        stock: 30,
        minStock: 8,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Soto Betawi',
        sku: 'MKN-008',
        barcode: '8991234008',
        categoryId: categories[0].id,
        unit: 'porsi',
        costPrice: 15000,
        sellPrice: 30000,
        stock: 25,
        minStock: 5,
        branchId: branchPusat.id,
      },
    }),

    // Minuman (5 products)
    prisma.product.create({
      data: {
        name: 'Es Teh Manis',
        sku: 'MNM-001',
        barcode: '8991234009',
        categoryId: categories[1].id,
        unit: 'gelas',
        costPrice: 2000,
        sellPrice: 5000,
        stock: 100,
        minStock: 20,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Es Jeruk Segar',
        sku: 'MNM-002',
        barcode: '8991234010',
        categoryId: categories[1].id,
        unit: 'gelas',
        costPrice: 3000,
        sellPrice: 8000,
        stock: 80,
        minStock: 15,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Kopi Susu Gula Aren',
        sku: 'MNM-003',
        barcode: '8991234011',
        categoryId: categories[1].id,
        unit: 'gelas',
        costPrice: 8000,
        sellPrice: 18000,
        stock: 50,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Jus Alpukat',
        sku: 'MNM-004',
        barcode: '8991234012',
        categoryId: categories[1].id,
        unit: 'gelas',
        costPrice: 7000,
        sellPrice: 15000,
        stock: 40,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Air Mineral (600ml)',
        sku: 'MNM-005',
        barcode: '8991234013',
        categoryId: categories[1].id,
        unit: 'botol',
        costPrice: 2500,
        sellPrice: 5000,
        stock: 200,
        minStock: 50,
        branchId: branchPusat.id,
      },
    }),

    // Snack (4 products)
    prisma.product.create({
      data: {
        name: 'Pisang Goreng',
        sku: 'SNK-001',
        barcode: '8991234014',
        categoryId: categories[2].id,
        unit: 'pcs',
        costPrice: 3000,
        sellPrice: 8000,
        stock: 30,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tahu Crispy',
        sku: 'SNK-002',
        barcode: '8991234015',
        categoryId: categories[2].id,
        unit: 'pcs',
        costPrice: 2000,
        sellPrice: 5000,
        stock: 40,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Kentang Goreng',
        sku: 'SNK-003',
        barcode: '8991234016',
        categoryId: categories[2].id,
        unit: 'porsi',
        costPrice: 5000,
        sellPrice: 15000,
        stock: 25,
        minStock: 8,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Risol Mayo',
        sku: 'SNK-004',
        barcode: '8991234017',
        categoryId: categories[2].id,
        unit: 'pcs',
        costPrice: 2500,
        sellPrice: 6000,
        stock: 35,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),

    // Dessert (2 products)
    prisma.product.create({
      data: {
        name: 'Es Krim Vanilla',
        sku: 'DST-001',
        barcode: '8991234018',
        categoryId: categories[3].id,
        unit: 'scoop',
        costPrice: 5000,
        sellPrice: 12000,
        stock: 40,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Puding Coklat',
        sku: 'DST-002',
        barcode: '8991234019',
        categoryId: categories[3].id,
        unit: 'cup',
        costPrice: 4000,
        sellPrice: 10000,
        stock: 30,
        minStock: 10,
        branchId: branchPusat.id,
      },
    }),

    // Lainnya (1 product)
    prisma.product.create({
      data: {
        name: 'Tissue Meja',
        sku: 'LNN-001',
        barcode: '8991234020',
        categoryId: categories[4].id,
        unit: 'pcs',
        costPrice: 2000,
        sellPrice: 5000,
        stock: 100,
        minStock: 20,
        branchId: branchPusat.id,
      },
    }),
  ])

  console.log(`  ✅ Created ${products.length} products`)

  // ==================== 7. TAX SETTING ====================
  console.log('💰 Creating tax setting...')
  await prisma.taxSetting.create({
    data: {
      isEnabled: true,
      percentage: 11,
      mode: 'exclude',
      applyToAll: true,
    },
  })
  console.log('  ✅ Tax setting created (11%, exclude mode, enabled)')

  // ==================== 8. SERVICE CHARGE SETTING ====================
  console.log('💳 Creating service charge setting...')
  await prisma.serviceChargeSetting.create({
    data: {
      isEnabled: false,
      percentage: 5,
    },
  })
  console.log('  ✅ Service charge setting created (5%, disabled)')

  // ==================== 9. STORE SETTINGS ====================
  console.log('🏪 Creating store settings...')
  const storeSettings = [
    { key: 'store_name', value: 'Toko Sejahtera', description: 'Nama toko' },
    { key: 'store_address', value: 'Jl. Merdeka No. 1, Jakarta Pusat 10110', description: 'Alamat toko' },
    { key: 'store_phone', value: '021-1234567', description: 'Nomor telepon toko' },
    { key: 'store_email', value: 'info@tokosejahtera.com', description: 'Email toko' },
    { key: 'currency', value: 'IDR', description: 'Mata uang' },
    { key: 'currency_symbol', value: 'Rp', description: 'Simbol mata uang' },
    { key: 'timezone', value: 'Asia/Jakarta', description: 'Zona waktu' },
    { key: 'invoice_prefix', value: 'INV', description: 'Prefix nomor invoice' },
    { key: 'receipt_footer', value: 'Terima kasih atas kunjungan Anda!', description: 'Footer struk' },
  ]

  await Promise.all(
    storeSettings.map((setting) =>
      prisma.storeSetting.create({ data: setting })
    )
  )
  console.log(`  ✅ Created ${storeSettings.length} store settings`)

  // ==================== 10. SAMPLE TRANSACTIONS ====================
  console.log('🧾 Creating sample transactions...')
  const cashiers = [cashier1, cashier2]
  const paymentMethods = ['cash', 'cash', 'cash', 'qris', 'transfer']
  const transactionStatuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'cancelled']

  let invoiceCounter = 1

  for (let i = 0; i < 20; i++) {
    const daysBack = randomBetween(0, 30)
    const txDate = daysAgo(daysBack)
    txDate.setHours(randomBetween(8, 21), randomBetween(0, 59), randomBetween(0, 59))

    const status = transactionStatuses[randomBetween(0, transactionStatuses.length - 1)]
    const cashier = cashiers[randomBetween(0, cashiers.length - 1)]
    const branch = cashier.branchId === branchPusat.id ? branchPusat : branchCabang1
    const paymentMethod = paymentMethods[randomBetween(0, paymentMethods.length - 1)]

    // Pick 1-4 random products
    const numItems = randomBetween(1, 4)
    const shuffledProducts = [...products].sort(() => Math.random() - 0.5)
    const selectedProducts = shuffledProducts.slice(0, numItems)

    const invoiceNumber = `INV-${String(invoiceCounter).padStart(6, '0')}`
    invoiceCounter++

    const customer = Math.random() > 0.4 ? customers[randomBetween(0, customers.length - 1)] : null

    let subtotal = 0
    const txItems = selectedProducts.map((product) => {
      const qty = randomBetween(1, 3)
      const price = product.sellPrice
      const total = qty * price
      subtotal += total
      return {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        price,
        costPrice: product.costPrice,
        discount: 0,
        total,
      }
    })

    const discountAmount = Math.random() > 0.7 ? randomFloat(1000, 10000) : 0
    const taxAmount = Math.round((subtotal - discountAmount) * 0.11)
    const grandTotal = subtotal - discountAmount + taxAmount
    const paidAmount = status === 'cancelled' ? 0 : grandTotal
    const changeAmount = paymentMethod === 'cash' && status === 'completed' ? Math.max(0, paidAmount - grandTotal + randomBetween(0, 5000)) : 0

    const tx = await prisma.transaction.create({
      data: {
        invoiceNumber,
        userId: cashier.id,
        customerId: customer?.id,
        branchId: branch.id,
        type: 'sale',
        status,
        subtotal,
        discountAmount,
        taxAmount,
        serviceCharge: 0,
        grandTotal,
        paidAmount,
        changeAmount,
        paymentMethod,
        notes: '',
        completedAt: status === 'completed' ? txDate : null,
        createdAt: txDate,
        items: {
          create: txItems,
        },
      },
    })

    // Update product stock for completed transactions
    if (status === 'completed') {
      for (const item of txItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
    }

    // Add member points if customer exists
    if (customer && status === 'completed') {
      const points = Math.floor(grandTotal / 10000)
      if (points > 0) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { memberPoint: { increment: points } },
        })
      }
    }
  }

  console.log('  ✅ Created 20 sample transactions')

  // ==================== 11. STOCK ADJUSTMENTS ====================
  console.log('📊 Creating stock adjustments...')
  const adjustmentTypes = ['in', 'out', 'adjustment', 'opname']
  const adjustmentReasons = [
    'Stok opname bulanan',
    'Barang rusak/expired',
    'Restock dari supplier',
    'Koreksi stok',
    'Penyesuaian stok awal',
  ]

  for (let i = 0; i < 5; i++) {
    const product = products[randomBetween(0, products.length - 1)]
    const adjType = adjustmentTypes[randomBetween(0, adjustmentTypes.length - 1)]
    const currentStock = await prisma.product.findUnique({ where: { id: product.id } }).then((p) => p?.stock || 0)

    let quantity: number
    let newStock: number

    if (adjType === 'in') {
      quantity = randomBetween(5, 30)
      newStock = currentStock + quantity
    } else if (adjType === 'out') {
      quantity = Math.min(randomBetween(1, 10), currentStock)
      newStock = currentStock - quantity
    } else {
      quantity = randomBetween(-5, 10)
      newStock = Math.max(0, currentStock + quantity)
    }

    await prisma.stockAdjustment.create({
      data: {
        productId: product.id,
        userId: adminUser.id,
        branchId: branchPusat.id,
        type: adjType,
        quantity: Math.abs(quantity),
        previousStock: currentStock,
        newStock,
        reason: adjustmentReasons[randomBetween(0, adjustmentReasons.length - 1)],
        createdAt: daysAgo(randomBetween(1, 15)),
      },
    })

    // Update product stock
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: newStock },
    })
  }

  console.log('  ✅ Created 5 stock adjustments')

  // ==================== 12. PURCHASES ====================
  console.log('🛒 Creating purchases...')
  const purchaseStatuses = ['received', 'received', 'received', 'pending']

  for (let i = 0; i < 4; i++) {
    const supplier = suppliers[randomBetween(0, suppliers.length - 1)]
    const status = purchaseStatuses[randomBetween(0, purchaseStatuses.length - 1)]
    const purchaseDate = daysAgo(randomBetween(5, 25))
    const purchaseInvoice = `PO-${String(i + 1).padStart(5, '0')}`

    const numPurchaseItems = randomBetween(2, 5)
    const shuffledProductsForPurchase = [...products].sort(() => Math.random() - 0.5)
    const selectedPurchaseProducts = shuffledProductsForPurchase.slice(0, numPurchaseItems)

    let totalAmount = 0
    const purchaseItems = selectedPurchaseProducts.map((product) => {
      const qty = randomBetween(10, 50)
      const costPrice = product.costPrice
      const total = qty * costPrice
      totalAmount += total
      return {
        productId: product.id,
        quantity: qty,
        costPrice,
        total,
      }
    })

    await prisma.purchase.create({
      data: {
        invoiceNumber: purchaseInvoice,
        supplierId: supplier.id,
        userId: adminUser.id,
        branchId: branchPusat.id,
        totalAmount,
        status,
        notes: `Pembelian dari ${supplier.name}`,
        createdAt: purchaseDate,
        items: {
          create: purchaseItems,
        },
      },
    })
  }

  console.log('  ✅ Created 4 purchases')

  console.log('\n🎉 Seeding completed successfully!')
  console.log('\n📋 Summary:')
  console.log('  - 2 branches')
  console.log('  - 4 users (1 super_admin, 1 admin, 2 cashiers)')
  console.log('  - 5 categories')
  console.log('  - 3 suppliers')
  console.log('  - 5 customers')
  console.log('  - 20 products')
  console.log('  - 1 tax setting')
  console.log('  - 1 service charge setting')
  console.log('  - 9 store settings')
  console.log('  - 20 transactions')
  console.log('  - 5 stock adjustments')
  console.log('  - 4 purchases')
  console.log('\n🔑 Default login: admin@pos.com / admin123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

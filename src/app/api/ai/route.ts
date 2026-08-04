import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Read a single StoreSetting value, returning fallback if missing */
async function getSetting(key: string, fallback = ''): Promise<string> {
  const row = await db.storeSetting.findUnique({ where: { key } })
  return row?.value ?? fallback
}

/** Call OpenAI-compatible chat completions endpoint */
async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`OpenAI API error (${response.status}): ${errBody}`)
  }

  const result = await response.json()
  const reply = result.choices?.[0]?.message?.content
  if (!reply) throw new Error('Tidak ada respons dari AI')
  return reply
}

/** Check whether a specific AI feature is enabled */
async function isFeatureEnabled(feature: string): Promise<boolean> {
  const raw = await getSetting('ai_enabled_features')
  if (!raw) return false
  try {
    const features: string[] = JSON.parse(raw)
    return features.includes(feature)
  } catch {
    return false
  }
}

/** Ensure AI is configured; returns [apiKey, model] or throws */
async function ensureAIConfigured(): Promise<[string, string]> {
  const apiKey = await getSetting('ai_api_key')
  const model = await getSetting('ai_model', 'gpt-4o-mini')
  if (!apiKey) throw new Error('AI belum dikonfigurasi. Silakan atur API key di pengaturan AI.')
  return [apiKey, model]
}

// ----------------------------------------------------------------
// Validation
// ----------------------------------------------------------------

const aiActionSchema = z.object({
  action: z.enum(['test', 'smart_suggestion', 'sales_analysis', 'stock_prediction']),
})

// ----------------------------------------------------------------
// POST /api/ai
// ----------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = aiActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { action } = parsed.data

    switch (action) {
      case 'test':
        return handleTest()
      case 'smart_suggestion':
        return handleSmartSuggestion()
      case 'sales_analysis':
        return handleSalesAnalysis()
      case 'stock_prediction':
        return handleStockPrediction()
    }
  } catch (error) {
    console.error('AI API error:', error)
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ----------------------------------------------------------------
// Action handlers
// ----------------------------------------------------------------

/** 1. Test AI connection */
async function handleTest() {
  const apiKey = await getSetting('ai_api_key')
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key belum diatur. Silakan konfigurasi API key AI di pengaturan.' },
      { status: 400 }
    )
  }

  const model = await getSetting('ai_model', 'gpt-4o-mini')

  const reply = await callOpenAI(
    apiKey,
    model,
    'You are a helpful assistant. Reply briefly.',
    'Hi'
  )

  return NextResponse.json({
    data: {
      success: true,
      model,
      reply: reply.trim(),
    },
  })
}

/** 2. Smart product suggestions based on recent transactions */
async function handleSmartSuggestion() {
  const enabled = await isFeatureEnabled('smart_suggestion')
  if (!enabled) {
    return NextResponse.json(
      { error: 'Fitur smart suggestion belum diaktifkan.' },
      { status: 400 }
    )
  }

  const [apiKey, model] = await ensureAIConfigured()

  // Fetch last 5 completed transactions with items
  const transactions = await db.transaction.findMany({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      items: {
        select: {
          productName: true,
          quantity: true,
          price: true,
        },
      },
    },
  })

  if (transactions.length === 0) {
    return NextResponse.json(
      { error: 'Belum ada data transaksi untuk dianalisis.' },
      { status: 400 }
    )
  }

  // Build transaction summary for the prompt
  const txSummary = transactions
    .map((tx, i) => {
      const items = tx.items
        .map((it) => `  - ${it.productName} x${it.quantity} (Rp ${it.price.toLocaleString('id-ID')})`)
        .join('\n')
      return `Transaksi ${i + 1} (${tx.invoiceNumber}):\n${items}`
    })
    .join('\n\n')

  const systemPrompt = `Kamu adalah asisten AI untuk sistem POS (Point of Sale) bernama "Toko Sejahtera". 
Berdasarkan riwayat transaksi, berikan saran produk pelengkap yang mungkin menarik bagi pelanggan. 
Balas dalam format JSON array of objects dengan field: { "name": string, "reason": string }.
Maksimal 5 saran. Jangan sertakan teks apapun di luar JSON array tersebut.`

  const userPrompt = `Berikut adalah 5 transaksi terakhir:\n\n${txSummary}\n\nBerdasarkan pola pembelian ini, produk apa yang sebaiknya ditawarkan sebagai produk pelengkap? Berikan saran sebagai JSON array.`

  const reply = await callOpenAI(apiKey, model, systemPrompt, userPrompt)

  let suggestions: { name: string; reason: string }[] = []
  try {
    const cleaned = reply.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      suggestions = parsed.map((item: Record<string, unknown>) => ({
        name: String(item.name ?? ''),
        reason: String(item.reason ?? ''),
      }))
    }
  } catch {
    // If AI doesn't return valid JSON, return raw text
    suggestions = [{ name: 'Saran AI', reason: reply.trim() }]
  }

  return NextResponse.json({ data: { suggestions } })
}

/** 3. Sales analysis for today and this week */
async function handleSalesAnalysis() {
  const enabled = await isFeatureEnabled('sales_analysis')
  if (!enabled) {
    return NextResponse.json(
      { error: 'Fitur sales analysis belum diaktifkan.' },
      { status: 400 }
    )
  }

  const [apiKey, model] = await ensureAIConfigured()

  // Today's stats
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todayTx = await db.transaction.findMany({
    where: {
      status: 'completed',
      createdAt: { gte: todayStart, lte: todayEnd },
    },
    select: {
      grandTotal: true,
      paymentMethod: true,
      items: {
        select: { productName: true, quantity: true, total: true },
      },
    },
  })

  // Last 7 days stats
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)

  const weekTx = await db.transaction.findMany({
    where: {
      status: 'completed',
      createdAt: { gte: weekStart, lte: todayEnd },
    },
    select: {
      grandTotal: true,
      paymentMethod: true,
      createdAt: true,
      items: {
        select: { productName: true, quantity: true, total: true },
      },
    },
  })

  // Aggregate today
  const todayCount = todayTx.length
  const todayRevenue = todayTx.reduce((sum, tx) => sum + tx.grandTotal, 0)
  const todayProducts: Record<string, { qty: number; revenue: number }> = {}
  for (const tx of todayTx) {
    for (const item of tx.items) {
      if (!todayProducts[item.productName]) todayProducts[item.productName] = { qty: 0, revenue: 0 }
      todayProducts[item.productName].qty += item.quantity
      todayProducts[item.productName].revenue += item.total
    }
  }
  const todayTopProducts = Object.entries(todayProducts)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
    .map(([name, data]) => `${name} (${data.qty} pcs, Rp ${data.revenue.toLocaleString('id-ID')})`)
    .join('; ')

  // Aggregate week
  const weekCount = weekTx.length
  const weekRevenue = weekTx.reduce((sum, tx) => sum + tx.grandTotal, 0)
  const weekPaymentMethods: Record<string, number> = {}
  for (const tx of weekTx) {
    weekPaymentMethods[tx.paymentMethod] = (weekPaymentMethods[tx.paymentMethod] || 0) + 1
  }
  const paymentBreakdown = Object.entries(weekPaymentMethods)
    .map(([method, count]) => `${method}: ${count} transaksi`)
    .join(', ')

  const systemPrompt = `Kamu adalah analis penjualan AI untuk sistem POS "Toko Sejahtera". 
Analisis data penjualan yang diberikan dan berikan insight dalam bahasa Indonesia yang singkat, padat, dan mudah dipahami. 
Berikan analisis tentang: 1) Performa hari ini, 2) Tren minggu ini, 3) Metode pembayaran, 4) Rekomendasi.
Balas dalam format teks biasa (bukan JSON).`

  const userPrompt = `Data penjualan hari ini (Tanggal: ${todayStart.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}):
- Jumlah transaksi: ${todayCount}
- Total pendapatan: Rp ${todayRevenue.toLocaleString('id-ID')}
- Produk terlaris: ${todayTopProducts || 'Tidak ada data'}

Data penjualan 7 hari terakhir:
- Jumlah transaksi: ${weekCount}
- Total pendapatan: Rp ${weekRevenue.toLocaleString('id-ID')}
- Rata-rata pendapatan per transaksi: Rp ${weekCount > 0 ? Math.round(weekRevenue / weekCount).toLocaleString('id-ID') : 0}
- Distribusi metode pembayaran: ${paymentBreakdown || 'Tidak ada data'}

Berikan analisis dan rekomendasi penjualan.`

  const analysis = await callOpenAI(apiKey, model, systemPrompt, userPrompt)

  return NextResponse.json({ data: { analysis: analysis.trim() } })
}

/** 4. Stock prediction - which products need restocking soon */
async function handleStockPrediction() {
  const enabled = await isFeatureEnabled('stock_prediction')
  if (!enabled) {
    return NextResponse.json(
      { error: 'Fitur stock prediction belum diaktifkan.' },
      { status: 400 }
    )
  }

  const [apiKey, model] = await ensureAIConfigured()

  // Get products with low stock (stock <= 100 to include near-low products)
  const lowStockProducts = await db.product.findMany({
    where: {
      isActive: true,
      stock: { lte: 100 },
    },
    select: {
      id: true,
      name: true,
      stock: true,
      minStock: true,
      unit: true,
      category: { select: { name: true } },
    },
    orderBy: { stock: 'asc' },
    take: 20,
  })

  // Get recent transaction items (last 30 days) for demand context
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentItems = await db.transactionItem.findMany({
    where: {
      transaction: {
        status: 'completed',
        createdAt: { gte: thirtyDaysAgo },
      },
    },
    select: {
      productName: true,
      quantity: true,
      transaction: { select: { createdAt: true } },
    },
    orderBy: { transaction: { createdAt: 'desc' } },
    take: 200,
  })

  // Aggregate demand per product in last 30 days
  const demandMap: Record<string, { totalQty: number; txCount: number }> = {}
  for (const item of recentItems) {
    if (!demandMap[item.productName]) demandMap[item.productName] = { totalQty: 0, txCount: 0 }
    demandMap[item.productName].totalQty += item.quantity
    demandMap[item.productName].txCount += 1
  }

  const productSummary = lowStockProducts.map((p) => {
    const demand = demandMap[p.name]
    const dailyAvg = demand ? (demand.totalQty / 30).toFixed(1) : '0'
    return {
      name: p.name,
      category: p.category?.name ?? 'Tanpa kategori',
      currentStock: p.stock,
      minStock: p.minStock,
      unit: p.unit,
      soldLast30Days: demand?.totalQty ?? 0,
      dailyAvgSales: Number(dailyAvg),
      estimatedDaysLeft: demand && demand.totalQty > 0 ? Math.floor(p.stock / (demand.totalQty / 30)) : null,
    }
  })

  const systemPrompt = `Kamu adalah analis inventaris AI untuk sistem POS "Toko Sejahtera". 
Berdasarkan data stok dan permintaan, prediksi produk mana yang perlu segera di-restock.
Balas dalam format JSON array of objects dengan field: { "productName": string, "urgency": "high" | "medium" | "low", "reason": string, "suggestedOrderQty": number }.
Maksimal 10 prediksi. Urutkan berdasarkan urgensi. Jangan sertakan teks apapun di luar JSON array tersebut.`

  const userPrompt = `Berikut data stok produk saat ini dan permintaan 30 hari terakhir (format JSON):\n\n${JSON.stringify(productSummary, null, 2)}\n\nBerdasarkan data ini, produk mana yang perlu segera di-restock? Berikan prediksi sebagai JSON array.`

  const reply = await callOpenAI(apiKey, model, systemPrompt, userPrompt)

  let predictions: { productName: string; urgency: string; reason: string; suggestedOrderQty: number }[] = []
  try {
    const cleaned = reply.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      predictions = parsed.map((item: Record<string, unknown>) => ({
        productName: String(item.productName ?? item.name ?? ''),
        urgency: String(item.urgency ?? 'medium'),
        reason: String(item.reason ?? ''),
        suggestedOrderQty: Number(item.suggestedOrderQty ?? 0),
      }))
    }
  } catch {
    predictions = [{ productName: 'Analisis AI', urgency: 'medium', reason: reply.trim(), suggestedOrderQty: 0 }]
  }

  return NextResponse.json({ data: { predictions } })
}

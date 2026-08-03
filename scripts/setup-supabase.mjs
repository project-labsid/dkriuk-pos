/**
 * Setup Database Script for Dkriuk POS
 * 
 * USAGE:
 *   node scripts/setup-supabase.mjs
 * 
 * PREREQUISITES:
 *   1. Make sure DATABASE_URL in .env points to your Supabase PostgreSQL
 *   2. Run: npx prisma generate
 *   3. Run: node scripts/setup-supabase.mjs
 */

import pg from 'pg'
import { execSync } from 'child_process'
import 'dotenv/config'

const { Client } = pg

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL || DATABASE_URL.startsWith('file:')) {
  console.error('❌ ERROR: DATABASE_URL not set or still pointing to local SQLite.')
  console.error('   Please update .env with your Supabase PostgreSQL URL:')
  console.error('   DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
  console.error('')
  console.error('   You can find this in Supabase Dashboard > Settings > Database > Connection string > URI')
  process.exit(1)
}

async function main() {
  console.log('🔧 Dkriuk POS - Supabase Database Setup')
  console.log('='.repeat(50))
  console.log(`📡 Connecting to: ${DATABASE_URL.replace(/:[^@]+@/, ':****@')}`)
  console.log('')

  const client = new Client({ connectionString: DATABASE_URL })

  try {
    await client.connect()
    console.log('✅ Connected to database successfully!')
    console.log('')

    // Step 1: Push Prisma schema
    console.log('📦 Step 1: Pushing Prisma schema...')
    try {
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        env: { ...process.env }
      })
      console.log('✅ Schema pushed successfully!')
    } catch (err) {
      console.log('⚠️  Prisma push had issues, trying to continue...')
    }
    console.log('')

    // Step 2: Disable RLS on all tables
    console.log('🔓 Step 2: Disabling Row Level Security (RLS)...')
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `)

    const tables = tablesResult.rows.map(r => r.tablename)
    console.log(`   Found ${tables.length} tables: ${tables.join(', ')}`)
    console.log('')

    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`)
        console.log(`   ✅ RLS disabled on "${table}"`)
      } catch (err) {
        console.log(`   ⚠️  Could not disable RLS on "${table}": ${err.message}`)
      }
    }
    console.log('')

    // Step 3: Verify tables
    console.log('📋 Step 3: Verifying tables...')
    const expectedTables = [
      'User', 'Branch', 'Category', 'Supplier', 'Customer',
      'Product', 'Transaction', 'TransactionItem', 'Purchase',
      'PurchaseItem', 'StockAdjustment', 'StoreSetting',
      'TaxSetting', 'ServiceChargeSetting', 'ActivityLog'
    ]

    for (const table of expectedTables) {
      const exists = tables.includes(table)
      console.log(`   ${exists ? '✅' : '❌'} ${table}`)
    }
    console.log('')

    console.log('🎉 Setup complete!')
    console.log('')
    console.log('NEXT STEPS:')
    console.log('1. Set DATABASE_URL in Vercel Dashboard > Settings > Environment Variables')
    console.log('2. Redeploy your app in Vercel')
    console.log('')
    console.log('   DATABASE_URL = ' + DATABASE_URL.replace(/:[^@]+@/, ':****@'))

  } catch (error) {
    console.error('')
    console.error('❌ Connection failed:', error.message)
    console.error('')
    console.error('Possible causes:')
    console.error('  - DATABASE_URL is incorrect')
    console.error('  - Supabase project is paused (open Supabase dashboard to unpause)')
    console.error('  - Network/firewall issue')
    console.error('')
    console.error('Make sure you use the SESSION MODE POOLER (port 5432), not Transaction mode (port 6543)')
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

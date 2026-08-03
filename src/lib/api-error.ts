import { NextResponse } from 'next/server'

/**
 * Classify a database/connection error and return a user-friendly response.
 */
export function classifyError(error: unknown): NextResponse {
  const msg = error instanceof Error ? error.message : String(error)

  // No DATABASE_URL configured
  if (msg.includes('INVALID_ARGUMENT') || msg.includes('Environment variable')) {
    return NextResponse.json(
      {
        error: 'Database belum dikonfigurasi',
        hint: 'Set DATABASE_URL di Vercel > Settings > Environment Variables',
      },
      { status: 503 }
    )
  }

  // Can't reach database
  if (
    msg.includes('P1001') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('fetch failed') ||
    msg.includes('connect ETIMEDOUT')
  ) {
    return NextResponse.json(
      {
        error: 'Tidak dapat terhubung ke database',
        hint: 'Periksa DATABASE_URL. Pastikan project Supabase aktif (bukan paused).',
      },
      { status: 503 }
    )
  }

  // Authentication error
  if (msg.includes('P3000') || msg.includes('authentication failed') || msg.includes('password authentication')) {
    return NextResponse.json(
      {
        error: 'Autentikasi database gagal',
        hint: 'Periksa password di DATABASE_URL',
      },
      { status: 503 }
    )
  }

  // Table/model doesn't exist (schema not pushed)
  if (msg.includes('P2021') || msg.includes('does not exist') || msg.includes('relation')) {
    return NextResponse.json(
      {
        error: 'Tabel database belum dibuat',
        hint: 'Jalankan: npx prisma db push',
      },
      { status: 503 }
    )
  }

  // RLS / permission denied
  if (msg.includes('permission denied') || msg.includes('P2025')) {
    return NextResponse.json(
      {
        error: 'Akses database ditolak (RLS aktif)',
        hint: 'Nonaktifkan RLS di semua tabel Supabase',
      },
      { status: 503 }
    )
  }

  // Generic fallback
  return NextResponse.json(
    {
      error: 'Terjadi kesalahan server',
      details: msg,
    },
    { status: 500 }
  )
}

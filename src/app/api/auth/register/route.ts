import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['super_admin', 'admin', 'cashier']).default('cashier'),
  phone: z.string().optional(),
  branchId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, role, phone, branchId } = parsed.data

    // Check if this is the first user (allow super_admin creation)
    const userCount = await db.user.count()
    const isFirstUser = userCount === 0

    // If not the first user, check if there's an authenticated super_admin
    // For simplicity, we'll check via a header for the requester's role
    // In production, this would use a proper auth middleware
    if (!isFirstUser) {
      const requesterRole = request.headers.get('x-user-role')
      if (requesterRole !== 'super_admin') {
        return NextResponse.json(
          { error: 'Hanya super admin yang dapat mendaftarkan pengguna baru' },
          { status: 403 }
        )
      }
    }

    // Check for existing email
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 409 }
      )
    }

    // Validate branchId if provided
    if (branchId) {
      const branch = await db.branch.findUnique({ where: { id: branchId } })
      if (!branch) {
        return NextResponse.json(
          { error: 'Cabang tidak ditemukan' },
          { status: 404 }
        )
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: isFirstUser ? 'super_admin' : role,
        phone,
        branchId,
      },
      include: { branch: true },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        module: 'AUTH',
        details: JSON.stringify({ email: user.email, role: user.role }),
      },
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { message: 'Pengguna berhasil didaftarkan', user: userWithoutPassword },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').optional(),
  email: z.string().email('Email tidak valid').optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'cashier']).optional(),
  branchId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/auth/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      include: { branch: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// PUT /api/auth/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check email uniqueness if email is being updated
    if (parsed.data.email && parsed.data.email !== existingUser.email) {
      const emailExists = await db.user.findUnique({ where: { email: parsed.data.email } })
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email sudah digunakan' },
          { status: 409 }
        )
      }
    }

    // Validate branchId if provided
    if (parsed.data.branchId) {
      const branch = await db.branch.findUnique({ where: { id: parsed.data.branchId } })
      if (!branch) {
        return NextResponse.json(
          { error: 'Cabang tidak ditemukan' },
          { status: 404 }
        )
      }
    }

    const user = await db.user.update({
      where: { id },
      data: parsed.data,
      include: { branch: true },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId: id,
        action: 'UPDATE_PROFILE',
        module: 'AUTH',
        details: JSON.stringify({ changes: Object.keys(parsed.data) }),
      },
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Pengguna berhasil diperbarui',
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if user has transactions
    const transactionCount = await db.transaction.count({
      where: { userId: id },
    })

    if (transactionCount > 0) {
      // Soft delete by deactivating instead
      await db.user.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        message: 'Pengguna memiliki transaksi. Akun dinonaktifkan alih-alih dihapus.',
      })
    }

    await db.user.delete({ where: { id } })

    // Log activity
    await db.activityLog.create({
      data: {
        action: 'DELETE_USER',
        module: 'AUTH',
        details: JSON.stringify({ deletedUser: user.email, role: user.role }),
      },
    })

    return NextResponse.json({ message: 'Pengguna berhasil dihapus' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

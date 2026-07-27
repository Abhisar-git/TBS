import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/rbac';

// GET /api/drivers — List all drivers (Admin only)
export async function GET(request: Request) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  try {
    const drivers = await prisma.driverProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        trips: {
          where: { status: { in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
          include: {
            passengers: {
              include: {
                guestProfile: {
                  include: {
                    user: { select: { name: true } },
                  },
                },
              },
            },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return NextResponse.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Get drivers error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/drivers — Admin onboards a new driver
export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  try {
    const body = await request.json();
    const { name, email, phone, password, vehicleNumber, vehicleModel, seatCapacity, luggageCapacity } = body;

    if (!name || !email || !vehicleNumber || !seatCapacity || !luggageCapacity) {
      return NextResponse.json(
        { success: false, error: 'Name, email, vehicle number, seat capacity, and luggage capacity are required' },
        { status: 400 }
      );
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password || 'driver123', 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || '',
        passwordHash,
        role: 'DRIVER',
        driverProfile: {
          create: {
            vehicleNumber: vehicleNumber.trim().toUpperCase(),
            vehicleModel: vehicleModel?.trim() || '',
            seatCapacity: parseInt(seatCapacity),
            luggageCapacity: parseInt(luggageCapacity),
          },
        },
      },
      include: {
        driverProfile: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...user.driverProfile,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create driver error:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

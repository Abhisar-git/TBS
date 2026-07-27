import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/rbac';

// PATCH /api/trips/[id]/accept — Driver accepts assigned trip
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  const { id } = await params;

  try {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { driver: true },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Verify driver owns this trip
    if (result.session.role === 'DRIVER') {
      const driverProfile = await prisma.driverProfile.findUnique({
        where: { userId: result.session.userId },
      });
      if (!driverProfile || trip.driverId !== driverProfile.id) {
        return NextResponse.json(
          { success: false, error: 'This trip is not assigned to you' },
          { status: 403 }
        );
      }
    } else if (result.session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    if (trip.status !== 'DRIVER_ASSIGNED') {
      return NextResponse.json(
        { success: false, error: 'Trip is not in DRIVER_ASSIGNED state' },
        { status: 400 }
      );
    }

    const updated = await prisma.trip.update({
      where: { id },
      data: { status: 'DRIVER_EN_ROUTE' },
      include: {
        driver: {
          include: { user: { select: { name: true, phone: true } } },
        },
        passengers: {
          include: {
            guestProfile: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    // Update driver status
    if (trip.driverId) {
      await prisma.driverProfile.update({
        where: { id: trip.driverId },
        data: { status: 'EN_ROUTE' },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Accept trip error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

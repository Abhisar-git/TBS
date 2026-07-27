import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/rbac';

// PATCH /api/trips/[id]/reject — Driver rejects assigned trip (re-queues guest)
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
      include: { passengers: true },
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
        { success: false, error: 'Trip can only be rejected in DRIVER_ASSIGNED state' },
        { status: 400 }
      );
    }

    // Remove driver assignment, set trip back to PENDING for re-assignment
    const updated = await prisma.trip.update({
      where: { id },
      data: {
        driverId: null,
        status: 'PENDING',
      },
    });

    // Free the driver
    if (trip.driverId) {
      await prisma.driverProfile.update({
        where: { id: trip.driverId },
        data: { status: 'AVAILABLE' },
      });
    }

    // Reset guest statuses back to WAITING
    const guestIds = trip.passengers.map(p => p.guestProfileId);
    if (guestIds.length) {
      await prisma.guestProfile.updateMany({
        where: { id: { in: guestIds } },
        data: { status: 'WAITING' },
      });
    }

    return NextResponse.json({ success: true, data: updated, message: 'Trip rejected. Guest re-queued for reassignment.' });
  } catch (error) {
    console.error('Reject trip error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

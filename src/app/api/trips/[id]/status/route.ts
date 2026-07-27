import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/rbac';

// PATCH /api/trips/[id]/status — Update trip status (Driver or Admin)
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
      include: { driver: true, passengers: true },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Verify driver owns this trip or is admin
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

    const body = await request.json();
    const { status } = body;

    const validTransitions: Record<string, string[]> = {
      'DRIVER_ASSIGNED': ['DRIVER_EN_ROUTE', 'CANCELLED'],
      'DRIVER_EN_ROUTE': ['DRIVER_ARRIVED', 'CANCELLED'],
      'DRIVER_ARRIVED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'PENDING': ['DRIVER_ASSIGNED', 'CANCELLED'],
    };

    const allowedNext = validTransitions[trip.status] || [];
    if (!allowedNext.includes(status) && result.session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: `Cannot transition from ${trip.status} to ${status}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };

    // Record timestamps for key transitions
    if (status === 'IN_PROGRESS') {
      updateData.actualStartAt = new Date();
      // Update all passengers to BOARDED
      await prisma.tripPassenger.updateMany({
        where: { tripId: id, boardingStatus: 'WAITING' },
        data: { boardingStatus: 'BOARDED' },
      });
      // Update guests to IN_TRANSIT
      const guestIds = trip.passengers.map(p => p.guestProfileId);
      await prisma.guestProfile.updateMany({
        where: { id: { in: guestIds } },
        data: { status: 'IN_TRANSIT' },
      });
    }

    if (status === 'COMPLETED') {
      updateData.actualEndAt = new Date();
      if (trip.actualStartAt) {
        updateData.actualDurationSec = Math.round(
          (Date.now() - new Date(trip.actualStartAt).getTime()) / 1000
        );
      }
      // Update passengers to DROPPED_OFF
      await prisma.tripPassenger.updateMany({
        where: { tripId: id, boardingStatus: 'BOARDED' },
        data: { boardingStatus: 'DROPPED_OFF' },
      });
      // Update guests to ARRIVED
      const guestIds = trip.passengers.map(p => p.guestProfileId);
      await prisma.guestProfile.updateMany({
        where: { id: { in: guestIds } },
        data: { status: 'ARRIVED' },
      });
      // Free the driver
      if (trip.driverId) {
        await prisma.driverProfile.update({
          where: { id: trip.driverId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    if (status === 'CANCELLED') {
      // Reset guest statuses
      const guestIds = trip.passengers.map(p => p.guestProfileId);
      await prisma.guestProfile.updateMany({
        where: { id: { in: guestIds } },
        data: { status: 'WAITING' },
      });
      // Free the driver
      if (trip.driverId) {
        await prisma.driverProfile.update({
          where: { id: trip.driverId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    if (status === 'DRIVER_EN_ROUTE' && trip.driverId) {
      await prisma.driverProfile.update({
        where: { id: trip.driverId },
        data: { status: 'EN_ROUTE' },
      });
    }

    if (status === 'DRIVER_ARRIVED' && trip.driverId) {
      await prisma.driverProfile.update({
        where: { id: trip.driverId },
        data: { status: 'ON_TRIP' },
      });
    }

    const updated = await prisma.trip.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update trip status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

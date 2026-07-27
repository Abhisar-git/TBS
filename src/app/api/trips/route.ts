import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/rbac';

// GET /api/trips — List trips (filtered by role)
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const tripType = searchParams.get('tripType');
  const driverId = searchParams.get('driverId');

  try {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (tripType) where.tripType = tripType;

    if (result.session.role === 'DRIVER') {
      // Driver sees only their own trips
      const driverProfile = await prisma.driverProfile.findUnique({
        where: { userId: result.session.userId },
      });
      if (!driverProfile) {
        return NextResponse.json(
          { success: false, error: 'Driver profile not found' },
          { status: 404 }
        );
      }
      where.driverId = driverProfile.id;
    } else if (result.session.role === 'GUEST') {
      // Guest sees only trips they're a passenger in
      const guestProfile = await prisma.guestProfile.findUnique({
        where: { userId: result.session.userId },
      });
      if (!guestProfile) {
        return NextResponse.json(
          { success: false, error: 'Guest profile not found' },
          { status: 404 }
        );
      }

      const trips = await prisma.trip.findMany({
        where: {
          ...where,
          passengers: { some: { guestProfileId: guestProfile.id } },
        },
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
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ success: true, data: trips });
    } else {
      // Admin sees all, optionally filtered by driver
      if (driverId) where.driverId = driverId;
    }

    const trips = await prisma.trip.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: trips });
  } catch (error) {
    console.error('Get trips error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/trips — Create a trip (Admin or system)
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  if (result.session.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Only admins can create trips' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      tripType, driverId,
      pickupAddress, pickupLat, pickupLng,
      dropoffAddress, dropoffLat, dropoffLng,
      scheduledPickupTime, guestProfileIds,
      estimatedDurationSec, distanceKm,
    } = body;

    if (!tripType || !pickupAddress || !dropoffAddress) {
      return NextResponse.json(
        { success: false, error: 'Trip type, pickup, and dropoff addresses are required' },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        tripType,
        driverId: driverId || null,
        pickupAddress,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        dropoffAddress,
        dropoffLat: parseFloat(dropoffLat),
        dropoffLng: parseFloat(dropoffLng),
        scheduledPickupTime: scheduledPickupTime ? new Date(scheduledPickupTime) : null,
        status: driverId ? 'DRIVER_ASSIGNED' : 'PENDING',
        estimatedDurationSec: estimatedDurationSec || null,
        distanceKm: distanceKm || null,
        passengers: {
          create: (guestProfileIds || []).map((gpId: string) => ({
            guestProfileId: gpId,
          })),
        },
      },
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

    // Update guest statuses
    if (guestProfileIds?.length) {
      await prisma.guestProfile.updateMany({
        where: { id: { in: guestProfileIds } },
        data: { status: driverId ? 'ASSIGNED' : 'WAITING' },
      });
    }

    // Update driver status if assigned
    if (driverId) {
      await prisma.driverProfile.update({
        where: { id: driverId },
        data: { status: 'EN_ROUTE' },
      });
    }

    return NextResponse.json({ success: true, data: trip }, { status: 201 });
  } catch (error) {
    console.error('Create trip error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import eventBroadcaster from '@/lib/events/eventBroadcaster';

export const dynamic = 'force-dynamic';

// POST /api/drivers/location — Driver posts location update
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  try {
    const body = await request.json();
    const { lat, lng, heading, speed } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: result.session.userId },
      include: {
        user: { select: { name: true } },
        trips: {
          where: { status: { in: ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
          include: { passengers: true },
          take: 1,
        },
      },
    });

    if (!driverProfile) {
      return NextResponse.json(
        { success: false, error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    // Update driver location
    await prisma.driverProfile.update({
      where: { id: driverProfile.id },
      data: {
        currentLat: parsedLat,
        currentLng: parsedLng,
        locationUpdatedAt: new Date(),
      },
    });

    // Broadcast live location to Admin dashboard
    const locationData = {
      driverId: driverProfile.id,
      driverName: driverProfile.user.name,
      vehicleNumber: driverProfile.vehicleNumber,
      lat: parsedLat,
      lng: parsedLng,
      heading: parseFloat(heading || 0),
      speed: parseFloat(speed || 0),
      status: driverProfile.status,
      timestamp: new Date().toISOString(),
    };

    eventBroadcaster.broadcast('admin', 'location_update', locationData);

    // Broadcast location to assigned guest if currently on a trip
    const activeTrip = driverProfile.trips[0];
    if (activeTrip && activeTrip.passengers.length > 0) {
      for (const passenger of activeTrip.passengers) {
        const guestProfile = await prisma.guestProfile.findUnique({
          where: { id: passenger.guestProfileId },
        });
        if (guestProfile) {
          eventBroadcaster.broadcast(`guest:${guestProfile.userId}`, 'location_update', {
            ...locationData,
            tripId: activeTrip.id,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth, requireAdmin } from '@/lib/auth/rbac';

// GET /api/ride-requests — List ride requests
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    if (result.session.role === 'GUEST') {
      // Guest sees only their own requests
      const guestProfile = await prisma.guestProfile.findUnique({
        where: { userId: result.session.userId },
      });
      if (!guestProfile) {
        return NextResponse.json({ success: true, data: [] });
      }
      where.guestProfileId = guestProfile.id;
    } else if (result.session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const requests = await prisma.rideRequest.findMany({
      where,
      include: {
        guestProfile: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
            accommodation: true,
          },
        },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get ride requests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/ride-requests — Guest raises a ride request
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  try {
    const guestProfile = await prisma.guestProfile.findUnique({
      where: { userId: result.session.userId },
    });

    if (!guestProfile && result.session.role === 'GUEST') {
      return NextResponse.json(
        { success: false, error: 'Guest profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { pickupPoint, dropoffPoint, guestProfileId, groupSize, luggageCount } = body;

    if (!pickupPoint || !dropoffPoint) {
      return NextResponse.json(
        { success: false, error: 'Pickup and dropoff points are required' },
        { status: 400 }
      );
    }

    const profileId = result.session.role === 'ADMIN' ? guestProfileId : guestProfile?.id;
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: 'Guest profile ID required' },
        { status: 400 }
      );
    }

    // Update guest profile group size & luggage count if provided
    if (groupSize !== undefined || luggageCount !== undefined) {
      const updateData: Record<string, number> = {};
      if (typeof groupSize === 'number' && groupSize >= 1) updateData.groupSize = groupSize;
      if (typeof luggageCount === 'number' && luggageCount >= 0) updateData.luggageCount = luggageCount;

      if (Object.keys(updateData).length > 0) {
        await prisma.guestProfile.update({
          where: { id: profileId },
          data: updateData,
        });
      }
    }

    // Check for existing pending request
    const existingPending = await prisma.rideRequest.findFirst({
      where: {
        guestProfileId: profileId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending ride request' },
        { status: 409 }
      );
    }

    const rideRequest = await prisma.rideRequest.create({
      data: {
        guestProfileId: profileId,
        pickupPoint,
        dropoffPoint,
      },
      include: {
        guestProfile: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: rideRequest }, { status: 201 });
  } catch (error) {
    console.error('Create ride request error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

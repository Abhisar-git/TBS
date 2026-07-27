import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/rbac';

// GET /api/guests/[id] — Get guest profile by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  const { id } = await params;

  try {
    const guestProfile = await prisma.guestProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        accommodation: true,
        tripPassengers: {
          include: {
            trip: {
              include: {
                driver: {
                  include: {
                    user: { select: { name: true, phone: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!guestProfile) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    // Non-admin can only see their own profile
    if (result.session.role !== 'ADMIN' && guestProfile.userId !== result.session.userId) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: guestProfile });
  } catch (error) {
    console.error('Get guest error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/guests/[id] — Update guest profile
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  const { id } = await params;

  try {
    // Verify ownership or admin
    const existing = await prisma.guestProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    if (result.session.role !== 'ADMIN' && existing.userId !== result.session.userId) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Fields that guests can update themselves
    if (body.flightOrTrainNumber !== undefined) updateData.flightOrTrainNumber = body.flightOrTrainNumber;
    if (body.arrivalEta !== undefined) updateData.arrivalEta = body.arrivalEta ? new Date(body.arrivalEta) : null;
    if (body.departureEta !== undefined) updateData.departureEta = body.departureEta ? new Date(body.departureEta) : null;
    if (body.groupSize !== undefined) updateData.groupSize = body.groupSize;
    if (body.luggageCount !== undefined) updateData.luggageCount = body.luggageCount;

    // Fields only admin can update
    if (result.session.role === 'ADMIN') {
      if (body.pickupPoint !== undefined) updateData.pickupPoint = body.pickupPoint;
      if (body.accommodationId !== undefined) updateData.accommodationId = body.accommodationId;
      if (body.status !== undefined) updateData.status = body.status;
    }

    const updated = await prisma.guestProfile.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        accommodation: true,
      },
    });

    // Update user name/phone if provided
    if (body.name || body.phone) {
      const userUpdate: Record<string, string> = {};
      if (body.name) userUpdate.name = body.name.trim();
      if (body.phone) userUpdate.phone = body.phone.trim();
      await prisma.user.update({
        where: { id: existing.userId },
        data: userUpdate,
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update guest error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

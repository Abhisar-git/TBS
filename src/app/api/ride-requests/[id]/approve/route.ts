import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/rbac';

// PATCH /api/ride-requests/[id]/approve — Admin approves a ride request
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  const { id } = await params;

  try {
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id },
      include: {
        guestProfile: {
          include: {
            user: true,
            accommodation: true,
          },
        },
      },
    });

    if (!rideRequest) {
      return NextResponse.json(
        { success: false, error: 'Ride request not found' },
        { status: 404 }
      );
    }

    if (rideRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Ride request is not in PENDING state' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Update ride request to APPROVED
    const updated = await prisma.rideRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: result.session.userId,
        adminNotes: body.notes || null,
        resolvedAt: new Date(),
      },
      include: {
        guestProfile: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
            accommodation: true,
          },
        },
      },
    });

    // Update guest status to WAITING (ready for matching engine)
    await prisma.guestProfile.update({
      where: { id: rideRequest.guestProfileId },
      data: { status: 'WAITING' },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Ride request approved. Guest queued for automatic driver assignment.',
    });
  } catch (error) {
    console.error('Approve ride request error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

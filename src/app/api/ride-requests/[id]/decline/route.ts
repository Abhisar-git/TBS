import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/rbac';

// PATCH /api/ride-requests/[id]/decline — Admin declines a ride request
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  const { id } = await params;

  try {
    const rideRequest = await prisma.rideRequest.findUnique({ where: { id } });

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

    const updated = await prisma.rideRequest.update({
      where: { id },
      data: {
        status: 'DECLINED',
        approvedById: result.session.userId,
        adminNotes: body.reason || 'Request declined by admin',
        resolvedAt: new Date(),
      },
      include: {
        guestProfile: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Decline ride request error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

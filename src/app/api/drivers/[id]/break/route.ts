import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/rbac';

// PATCH /api/drivers/[id]/break — Start or end break
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  const { id } = await params;

  try {
    const driver = await prisma.driverProfile.findUnique({ where: { id } });
    if (!driver) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    if (result.session.role !== 'ADMIN' && driver.userId !== result.session.userId) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, minutes } = body; // action: 'start' | 'end'

    if (action === 'start') {
      const breakMinutes = minutes || 15;
      const updated = await prisma.driverProfile.update({
        where: { id },
        data: {
          status: 'ON_BREAK',
          breakMinutesRemaining: breakMinutes,
          breakStartedAt: new Date(),
          availableAfter: new Date(Date.now() + breakMinutes * 60 * 1000),
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'end') {
      const updated = await prisma.driverProfile.update({
        where: { id },
        data: {
          status: 'AVAILABLE',
          breakMinutesRemaining: 0,
          breakStartedAt: null,
          availableAfter: null,
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: 'Action must be "start" or "end"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Driver break error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

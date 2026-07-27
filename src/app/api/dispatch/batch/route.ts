import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/rbac';
import { runBatchDispatch } from '@/lib/matching/engine';
import prisma from '@/lib/db/prisma';

// GET /api/dispatch/batch — Get dispatch queue status
export async function GET(request: Request) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  try {
    const waitingGuests = await prisma.guestProfile.count({ where: { status: 'WAITING' } });
    const availableDrivers = await prisma.driverProfile.count({ where: { status: 'AVAILABLE' } });
    const activeTrips = await prisma.trip.count({
      where: { status: { in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } },
    });

    return NextResponse.json({
      success: true,
      data: {
        waitingGuests,
        availableDrivers,
        activeTrips,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/dispatch/batch — Trigger Hungarian algorithm batch optimization
export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  try {
    const summary = await runBatchDispatch();
    return NextResponse.json({
      success: true,
      data: summary,
      message: `Batch optimization completed. ${summary.assignedCount} guests assigned to drivers.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

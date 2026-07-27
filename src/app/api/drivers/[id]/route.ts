import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth, requireAdmin } from '@/lib/auth/rbac';

// GET /api/drivers/[id] — Get driver profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  const { id } = await params;

  try {
    const driver = await prisma.driverProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            passengers: {
              include: {
                guestProfile: {
                  include: { user: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Driver can only see their own profile
    if (result.session.role === 'DRIVER' && driver.userId !== result.session.userId) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: driver });
  } catch (error) {
    console.error('Get driver error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/drivers/[id] — Update driver details (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.vehicleNumber !== undefined) updateData.vehicleNumber = body.vehicleNumber.trim().toUpperCase();
    if (body.vehicleModel !== undefined) updateData.vehicleModel = body.vehicleModel.trim();
    if (body.seatCapacity !== undefined) updateData.seatCapacity = parseInt(body.seatCapacity);
    if (body.luggageCapacity !== undefined) updateData.luggageCapacity = parseInt(body.luggageCapacity);
    if (body.status !== undefined) updateData.status = body.status;

    const updated = await prisma.driverProfile.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
      },
    });

    // Update user details if provided
    if (body.name || body.phone) {
      const userUpdate: Record<string, string> = {};
      if (body.name) userUpdate.name = body.name.trim();
      if (body.phone) userUpdate.phone = body.phone.trim();
      await prisma.user.update({
        where: { id: updated.userId },
        data: userUpdate,
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update driver error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/drivers/[id] — Remove driver (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin(request);
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

    // Delete user (cascades to driver profile)
    await prisma.user.delete({ where: { id: driver.userId } });

    return NextResponse.json({ success: true, message: 'Driver removed' });
  } catch (error) {
    console.error('Delete driver error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

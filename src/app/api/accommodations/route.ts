import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth, requireAdmin } from '@/lib/auth/rbac';

// GET /api/accommodations — List all accommodations
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  try {
    const accommodations = await prisma.accommodation.findMany({
      include: {
        _count: { select: { guests: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: accommodations });
  } catch (error) {
    console.error('Get accommodations error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/accommodations — Create accommodation (Admin only)
export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  try {
    const body = await request.json();
    const { name, address, lat, lng } = body;

    if (!name || !address || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, address, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    const accommodation = await prisma.accommodation.create({
      data: {
        name: name.trim(),
        address: address.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    });

    return NextResponse.json({ success: true, data: accommodation }, { status: 201 });
  } catch (error) {
    console.error('Create accommodation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

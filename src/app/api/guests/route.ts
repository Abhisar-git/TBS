import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireAuth, requireAdmin } from '@/lib/auth/rbac';

// GET /api/guests — List all guests (Admin) or get own profile (Guest)
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result.error;

  try {
    if (result.session.role === 'ADMIN') {
      const guests = await prisma.guestProfile.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true } },
          accommodation: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ success: true, data: guests });
    }

    // Guest sees only their own profile
    const guestProfile = await prisma.guestProfile.findUnique({
      where: { userId: result.session.userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        accommodation: true,
      },
    });

    if (!guestProfile) {
      return NextResponse.json(
        { success: false, error: 'Guest profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: guestProfile });
  } catch (error) {
    console.error('Get guests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/guests — Admin creates a guest (manual guest onboarding)
export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  try {
    const body = await request.json();
    const {
      name, email, phone, password,
      flightOrTrainNumber, arrivalEta, departureEta,
      pickupPoint, accommodationId, groupSize, luggageCount,
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password || 'guest123', 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || '',
        passwordHash,
        role: 'GUEST',
        guestProfile: {
          create: {
            flightOrTrainNumber: flightOrTrainNumber || null,
            arrivalEta: arrivalEta ? new Date(arrivalEta) : null,
            departureEta: departureEta ? new Date(departureEta) : null,
            pickupPoint: pickupPoint || '',
            accommodationId: accommodationId || null,
            groupSize: groupSize || 1,
            luggageCount: luggageCount || 1,
          },
        },
      },
      include: {
        guestProfile: {
          include: { accommodation: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...user.guestProfile,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create guest error:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

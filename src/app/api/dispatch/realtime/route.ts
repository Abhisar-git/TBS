import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/rbac';
import { dispatchSingleGuest } from '@/lib/matching/engine';

// POST /api/dispatch/realtime — Trigger single real-time guest dispatch
export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if ('error' in result) return result.error;

  try {
    const body = await request.json();
    const { guestProfileId } = body;

    if (!guestProfileId) {
      return NextResponse.json({ success: false, error: 'guestProfileId is required' }, { status: 400 });
    }

    const dispatchResult = await dispatchSingleGuest(guestProfileId);
    if (!dispatchResult.success) {
      return NextResponse.json({ success: false, error: dispatchResult.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: dispatchResult,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

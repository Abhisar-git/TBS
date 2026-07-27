import { NextResponse } from 'next/server';
import { getSessionFromHeader, type SessionPayload } from './session';
import type { UserRole } from '@/types';

/**
 * Require authentication — returns session or 401 response
 */
export async function requireAuth(
  request: Request
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSessionFromHeader(request);

  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  return { session };
}

/**
 * Require a specific role — returns session or 401/403 response
 */
export async function requireRole(
  request: Request,
  ...allowedRoles: UserRole[]
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const result = await requireAuth(request);

  if ('error' in result) return result;

  if (!allowedRoles.includes(result.session.role)) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * Require ADMIN role
 */
export async function requireAdmin(request: Request) {
  return requireRole(request, 'ADMIN');
}

/**
 * Require DRIVER role
 */
export async function requireDriver(request: Request) {
  return requireRole(request, 'DRIVER');
}

/**
 * Require ADMIN or DRIVER role
 */
export async function requireAdminOrDriver(request: Request) {
  return requireRole(request, 'ADMIN', 'DRIVER');
}

/**
 * Require the user is either the resource owner or an ADMIN
 */
export async function requireOwnerOrAdmin(
  request: Request,
  resourceUserId: string
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const result = await requireAuth(request);
  if ('error' in result) return result;

  if (result.session.role !== 'ADMIN' && result.session.userId !== resourceUserId) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      ),
    };
  }

  return result;
}

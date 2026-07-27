import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import eventBroadcaster from '@/lib/events/eventBroadcaster';

export const dynamic = 'force-dynamic';

// GET /api/events/admin-stream — Admin Operations SSE stream endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const session = await verifyToken(token);
  if (!session || session.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  const channel = 'admin';

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ channel: 'admin', adminId: session.userId })}\n\n`)
      );

      const unsubscribe = eventBroadcaster.subscribe(channel, (msg) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      });

      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeatInterval);
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

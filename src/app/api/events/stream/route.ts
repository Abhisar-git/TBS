import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/session';
import eventBroadcaster from '@/lib/events/eventBroadcaster';

export const dynamic = 'force-dynamic';

// GET /api/events/stream — Guest SSE stream endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const session = await verifyToken(token);
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const channel = `guest:${session.userId}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ channel, userId: session.userId })}\n\n`)
      );

      // Subscribe to guest channel
      const unsubscribe = eventBroadcaster.subscribe(channel, (msg) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`)
          );
        } catch {
          // Controller might be closed
        }
      });

      // Keep connection alive with heartbeats every 15s
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Clean up on disconnect
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

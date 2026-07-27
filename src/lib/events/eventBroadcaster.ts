/* ============================================================
   TBS — Real-Time Event Broadcaster
   In-memory pub/sub event bus powering Server-Sent Events (SSE)
   ============================================================ */

export interface BroadcastMessage<T = unknown> {
  channel: string;
  event: string;
  data: T;
  timestamp: string;
}

type EventListener = (message: BroadcastMessage) => void;

class EventBroadcaster {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Subscribe to a channel (e.g. 'guest:123', 'driver:456', 'admin')
   */
  subscribe(channel: string, listener: EventListener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }

    this.listeners.get(channel)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channel, listener);
    };
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, listener: EventListener): void {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.delete(listener);
      if (channelListeners.size === 0) {
        this.listeners.delete(channel);
      }
    }
  }

  /**
   * Broadcast an event payload to all listeners on a given channel
   */
  broadcast<T>(channel: string, event: string, data: T): void {
    const message: BroadcastMessage<T> = {
      channel,
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach((listener) => {
        try {
          listener(message as BroadcastMessage);
        } catch {
          // Ignore listener execution errors
        }
      });
    }
  }

  /**
   * Broadcast to admin channel as well as specific entity channel
   */
  notify(channel: string, event: string, data: unknown): void {
    this.broadcast(channel, event, data);
    if (channel !== 'admin') {
      this.broadcast('admin', event, { targetChannel: channel, ...(data as object) });
    }
  }
}

// Global singleton instance
const globalForBroadcaster = globalThis as unknown as {
  eventBroadcaster: EventBroadcaster | undefined;
};

export const eventBroadcaster =
  globalForBroadcaster.eventBroadcaster ?? new EventBroadcaster();

if (process.env.NODE_ENV !== 'production') {
  globalForBroadcaster.eventBroadcaster = eventBroadcaster;
}

export default eventBroadcaster;

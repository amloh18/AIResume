
/**
 * SSE Service for managing active server-sent events connections
 * and sending events to specific users.
 */

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

export const sseService = {
  /**
   * Register a new connection for a user
   */
  registerConnection(userId: string, controller: ReadableStreamDefaultController) {
    connections.set(userId, controller);
    console.log(`🔗 SSE connection stored for user ${userId}. Total active connections: ${connections.size}`);
  },

  /**
   * Remove a connection for a user
   */
  removeConnection(userId: string) {
    if (connections.has(userId)) {
      connections.delete(userId);
      console.log(`🔌 SSE connection removed for user ${userId}. Total active connections: ${connections.size}`);
    }
  },

  /**
   * Get active connection count
   */
  getConnectionCount() {
    return connections.size;
  },

  /**
   * Generic function to send an event to a specific user via SSE
   */
  async sendEventToUser(userId: string, type: string, payload: any) {
    const controller = connections.get(userId);
    if (controller) {
      const encoder = new TextEncoder();
      const data = JSON.stringify({
        type,
        [type]: payload,
      });
      try {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        console.log(`✅ Event [${type}] enqueued to SSE stream for user ${userId}`);
      } catch (error) {
        console.error(`Error sending ${type} via SSE:`, error);
        connections.delete(userId);
      }
    } else {
      // Log skip in dev
      if (process.env.NODE_ENV === 'development') {
        console.debug(`⏭️ No active SSE connection for user ${userId}, event [${type}] skipped`);
      }
    }
  },

  /**
   * Backward compatibility: sendNotificationToUser
   */
  async sendNotificationToUser(userId: string, notification: any) {
    return this.sendEventToUser(userId, 'notification', notification);
  }
};

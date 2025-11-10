import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import Notification from '@/models/Notification';

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    await getConnection();

    // Get user ID from session
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const userId = user._id.toString();

    // Create SSE stream with timeout handling
    const stream = new ReadableStream({
      start(controller) {
        // Store connection
        connections.set(userId, controller);

        // Send initial connection message
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

        // Set up interval to check for new notifications
        const interval = setInterval(async () => {
          try {
            // Check for unread notifications created in the last 5 seconds
            const fiveSecondsAgo = new Date(Date.now() - 5000);
            const newNotifications = await Notification.find({
              userId,
              read: false,
              createdAt: { $gte: fiveSecondsAgo },
            })
              .sort({ createdAt: -1 })
              .limit(10)
              .lean();

            for (const notification of newNotifications) {
              const data = JSON.stringify({
                type: 'notification',
                notification,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          } catch (error) {
            console.error('Error checking for new notifications:', error);
          }
        }, 5000); // Check every 5 seconds

        // Set up heartbeat to keep connection alive and detect disconnects
        let heartbeatCount = 0;
        const heartbeatInterval = setInterval(() => {
          try {
            heartbeatCount++;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', count: heartbeatCount, timestamp: Date.now() })}\n\n`));
          } catch (error) {
            // Connection closed, cleanup
            console.log(`💔 SSE heartbeat failed for user ${userId}, connection closed`);
            clearInterval(interval);
            clearInterval(heartbeatInterval);
            clearTimeout(connectionTimeout);
            connections.delete(userId);
          }
        }, 10000); // Send heartbeat every 10 seconds

        // Set connection timeout (25 seconds before Vercel's 30s limit)
        const connectionTimeout = setTimeout(() => {
          console.log(`⏱️ SSE connection timeout for user ${userId}, closing gracefully`);
          clearInterval(interval);
          clearInterval(heartbeatInterval);
          connections.delete(userId);
          try {
            controller.close();
          } catch (error) {
            // Connection may already be closed
            console.warn('Error closing SSE connection:', error);
          }
        }, 25000); // 25 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          console.log(`🔌 SSE connection aborted for user ${userId}`);
          clearInterval(interval);
          clearInterval(heartbeatInterval);
          clearTimeout(connectionTimeout);
          connections.delete(userId);
          try {
            controller.close();
          } catch (error) {
            // Connection may already be closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error setting up SSE stream:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Helper function to send notification to specific user
export async function sendNotificationToUser(userId: string, notification: any) {
  const controller = connections.get(userId);
  if (controller) {
    const encoder = new TextEncoder();
    const data = JSON.stringify({
      type: 'notification',
      notification,
    });
    try {
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    } catch (error) {
      console.error('Error sending notification via SSE:', error);
      connections.delete(userId);
    }
  }
}


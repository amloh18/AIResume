import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return new Response('Unauthorized', { status: 401 });
        }

        try {
            await getConnection();
        } catch (dbError) {
            console.error('Database connection error in stream route:', dbError);
            return new Response(JSON.stringify({ error: 'Database connection failed' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get user ID from session
        let userId: string;
        try {
            const User = (await import('@/models/User')).default;
            const user = await User.findOne({ email: session.user.email });
            if (!user) {
                return new Response(JSON.stringify({ error: 'User not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            userId = user._id.toString();
        } catch (userError) {
            console.error('Error finding user in stream route:', userError);
            return new Response(JSON.stringify({ error: 'Failed to find user' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create SSE stream with timeout handling
        // Determine if running locally (for timeout and heartbeat adjustments)
        const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                try {
                    // Store connection
                    connections.set(userId, controller);
                    console.log(`🔗 SSE connection stored for user ${userId}. Total active connections: ${connections.size}`);

                    // Send initial connection message
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
                } catch (startError) {
                    console.error('Error in stream start:', startError);
                    try {
                        controller.close();
                    } catch (closeError) {
                        console.error('Error closing controller:', closeError);
                    }
                    connections.delete(userId);
                    return;
                }

                // Set up interval to check for new notifications
                const interval = setInterval(async () => {
                    try {
                        // Check for unread notifications created in the last 5 seconds
                        const fiveSecondsAgo = new Date(Date.now() - 5000);

                        // Ensure userId is a valid ObjectId string
                        if (!userId || typeof userId !== 'string') {
                            console.error('Invalid userId in stream interval:', userId);
                            return;
                        }

                        // Convert userId to ObjectId for query
                        let userIdObjectId: mongoose.Types.ObjectId;
                        try {
                            userIdObjectId = new mongoose.Types.ObjectId(userId);
                        } catch (objectIdError) {
                            console.error('Invalid ObjectId format for userId:', userId, objectIdError);
                            return;
                        }

                        const newNotifications = await Notification.find({
                            userId: userIdObjectId,
                            read: false,
                            createdAt: { $gte: fiveSecondsAgo },
                        })
                            .sort({ createdAt: -1 })
                            .limit(10)
                            .lean();

                        for (const notification of newNotifications) {
                            try {
                                const data = JSON.stringify({
                                    type: 'notification',
                                    notification,
                                });
                                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                            } catch (encodeError) {
                                console.error('Error encoding notification:', encodeError);
                            }
                        }
                    } catch (error) {
                        console.error('Error checking for new notifications:', error);
                        // Don't throw - just log the error to prevent breaking the stream
                    }
                }, 5000); // Check every 5 seconds

                // Set up heartbeat to keep connection alive and detect disconnects
                // For local: every 30 seconds, for production: every 10 seconds
                const heartbeatIntervalMs = isLocal ? 30000 : 10000;

                let heartbeatCount = 0;
                const heartbeatInterval = setInterval(() => {
                    try {
                        heartbeatCount++;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', count: heartbeatCount, timestamp: Date.now() })}\n\n`));
                    } catch (error) {
                        // Connection closed, cleanup
                        if (isLocal) {
                            console.debug(`💔 SSE heartbeat failed for user ${userId}, connection closed`);
                        } else {
                            console.log(`💔 SSE heartbeat failed for user ${userId}, connection closed`);
                        }
                        clearInterval(interval);
                        clearInterval(heartbeatInterval);
                        clearTimeout(connectionTimeout);
                        connections.delete(userId);
                    }
                }, heartbeatIntervalMs);

                // Set connection timeout
                // For local development: 5 minutes, for production: 15 seconds (well within Vercel's 30s limit)
                const timeoutDuration = isLocal ? 300000 : 15000; // 5 minutes local, 15 seconds production

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
                }, timeoutDuration);

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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('SSE stream error details:', { errorMessage, errorStack, error });
        return new Response(JSON.stringify({
            error: 'Internal Server Error',
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? errorStack : undefined
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
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
            console.log(`✅ Notification enqueued to SSE stream for user ${userId}:`, notification.title);
        } catch (error) {
            console.error('Error sending notification via SSE:', error);
            connections.delete(userId);
        }
    } else {
        const activeUserIds = Array.from(connections.keys());
        console.warn(`⚠️ No SSE connection found for user ${userId}. Active connections:`, activeUserIds);
        console.warn(`⚠️ Notification will not be delivered via SSE. User may need to refresh the page.`);
    }
}

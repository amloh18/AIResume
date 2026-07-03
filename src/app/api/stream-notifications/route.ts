import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import Notification from '@/models/Notification';
import ActivityLog from '@/models/ActivityLog';
import mongoose from 'mongoose';
import { sseService } from '@/lib/services/sseService';

export const dynamic = 'force-dynamic';

// Helper to map activity log to frontend format (reused from dashboard/activities route)
function mapActivity(log: any) {
    let type: 'cv_updated' | 'applied' | 'interview' | 'improvement' | 'recommendation' = 'cv_updated';
    
    // Determine type based on action or resource
    if (log.action === 'applied' || log.resource?.type === 'job') {
      type = 'applied';
    } else if (log.action === 'interview' || log.resource?.type === 'journey') {
      type = 'interview';
    } else if (log.action === 'ats_check' || log.action === 'improvement') {
      type = 'improvement';
    } else if (log.action === 'recommendation') {
      type = 'recommendation';
    }

    // Format message with resource name if available
    let message = log.action;
    const resourceName = log.resource?.name || log.metadata?.name || log.metadata?.title;
    const resourceType = log.resource?.type;
    
    if (log.action === 'cv_updated' || log.action === 'updated' && resourceType === 'cv') {
      const cvType = log.metadata?.cvType || 'CV';
      const typeLabel = cvType === 'master' ? 'Master CV' : cvType === 'journey' ? 'Journey CV' : 'Standalone CV';
      message = `Updated ${typeLabel}: ${resourceName || 'Untitled'}`;
      type = 'cv_updated';
    } else if (log.action === 'cv_created' || log.action === 'created' && resourceType === 'cv') {
      const cvType = log.metadata?.cvType || 'CV';
      const typeLabel = cvType === 'master' ? 'Master CV' : cvType === 'journey' ? 'Journey CV' : 'Standalone CV';
      message = `Created ${typeLabel}: ${resourceName || 'Untitled'}`;
      type = 'cv_updated';
    } else if (log.action === 'applied' || resourceType === 'job') {
      message = `Applied for: ${resourceName || 'a new role'}`;
    } else if (log.action === 'user_action') {
      message = log.metadata?.message || log.action;
    }

    return {
      id: log._id.toString(),
      type,
      message,
      timestamp: log.timestamp,
      metadata: log.metadata
    };
}

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
        const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            start(controller) {
                try {
                    // Register connection with service
                    sseService.registerConnection(userId, controller);

                    // Send initial connection message
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`));
                } catch (startError) {
                    console.error('Error in stream start:', startError);
                    try {
                        controller.close();
                    } catch (closeError) {}
                    sseService.removeConnection(userId);
                    return;
                }

                // Track last sent IDs to avoid duplicates and gaps
                const sentNotificationIds = new Set<string>();
                const sentActivityIds = new Set<string>();

                // Set up interval to check for new notifications and activities
                const interval = setInterval(async () => {
                    try {
                        // Ensure userId is valid
                        let userIdObjectId: mongoose.Types.ObjectId;
                        try {
                            userIdObjectId = new mongoose.Types.ObjectId(userId);
                        } catch (e) { return; }

                        // 1. Check for new notifications (fetch unread from last 5 minutes)
                        const newNotifications = await Notification.find({
                            userId: userIdObjectId,
                            read: false,
                            createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
                        }).sort({ createdAt: 1 }).lean();

                        for (const notification of newNotifications) {
                            const notifId = notification._id.toString();
                            if (!sentNotificationIds.has(notifId)) {
                                sentNotificationIds.add(notifId);
                                const data = JSON.stringify({ type: 'notification', notification });
                                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                            }
                        }

                        // 2. Check for new activities (fetch from last 5 minutes)
                        const newActivities = await ActivityLog.find({
                            userId: userIdObjectId,
                            logType: 'user_action',
                            timestamp: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
                        }).sort({ timestamp: 1 }).lean();

                        for (const activity of newActivities) {
                            const actId = activity._id.toString();
                            if (!sentActivityIds.has(actId)) {
                                sentActivityIds.add(actId);
                                const mapped = mapActivity(activity);
                                const data = JSON.stringify({ type: 'activity', activity: mapped });
                                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                            }
                        }
                    } catch (error) {
                        console.error('Error checking for new events in SSE stream:', error);
                    }
                }, 4000); // Check every 4 seconds

                // Set up heartbeat
                const heartbeatIntervalMs = isLocal ? 30000 : 10000;
                let heartbeatCount = 0;
                const heartbeatInterval = setInterval(() => {
                    try {
                        heartbeatCount++;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', count: heartbeatCount, timestamp: Date.now() })}\n\n`));
                    } catch (error) {
                        clearInterval(interval);
                        clearInterval(heartbeatInterval);
                        clearTimeout(connectionTimeout);
                        sseService.removeConnection(userId);
                    }
                }, heartbeatIntervalMs);

                // Set connection timeout
                const timeoutDuration = isLocal ? 300000 : 15000;
                const connectionTimeout = setTimeout(() => {
                    console.log(`⏱️ SSE connection timeout for user ${userId}, closing gracefully`);
                    clearInterval(interval);
                    clearInterval(heartbeatInterval);
                    sseService.removeConnection(userId);
                    try {
                        controller.close();
                    } catch (error) {}
                }, timeoutDuration);

                // Cleanup on close
                request.signal.addEventListener('abort', () => {
                    console.log(`🔌 SSE connection aborted for user ${userId}`);
                    clearInterval(interval);
                    clearInterval(heartbeatInterval);
                    clearTimeout(connectionTimeout);
                    sseService.removeConnection(userId);
                    try {
                        controller.close();
                    } catch (error) {}
                });
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Content-Encoding': 'none',
            },
        });
    } catch (error: any) {
        console.error('Error setting up SSE stream:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

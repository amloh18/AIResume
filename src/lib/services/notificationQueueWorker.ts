import { getConnection } from '@/lib/database';
import NotificationQueue, { QueueTaskStatus } from '@/models/NotificationQueue';
import notificationService from './notificationService';

class NotificationQueueWorker {
  /**
   * Process the notification queue
   * This is the main worker loop that processes pending tasks
   */
  async processQueue(limit: number = 50): Promise<{
    processed: number;
    failed: number;
    total: number;
  }> {
    await getConnection();

    const result = await notificationService.processNotificationQueue(limit);

    return {
      ...result,
      total: result.processed + result.failed,
    };
  }

  /**
   * Process a single queue task
   */
  async processTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    await getConnection();

    const task = await NotificationQueue.findById(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    if (task.status !== 'pending') {
      return { success: false, error: `Task is not pending (status: ${task.status})` };
    }

    try {
      // Mark as processing
      task.status = 'processing';
      task.processedAt = new Date();
      await task.save();

      // Process using notification service
      await notificationService.processNotificationQueue(1);

      return { success: true };
    } catch (error: any) {
      console.error(`Error processing task ${taskId}:`, error);
      task.retries++;
      task.error = error.message;

      if (task.retries >= task.maxRetries) {
        task.status = 'failed';
      } else {
        task.status = 'pending';
        // Exponential backoff
        task.scheduledFor = new Date(Date.now() + Math.pow(2, task.retries) * 60 * 1000);
      }
      await task.save();

      return { success: false, error: error.message };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    await getConnection();

    const [pending, processing, completed, failed] = await Promise.all([
      NotificationQueue.countDocuments({ status: 'pending' }),
      NotificationQueue.countDocuments({ status: 'processing' }),
      NotificationQueue.countDocuments({ status: 'completed' }),
      NotificationQueue.countDocuments({ status: 'failed' }),
    ]);

    return {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
    };
  }

  /**
   * Clean up old completed tasks (older than 7 days)
   */
  async cleanupOldTasks(daysOld: number = 7): Promise<number> {
    await getConnection();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await NotificationQueue.deleteMany({
      status: 'completed',
      completedAt: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  /**
   * Retry failed tasks (up to max retries)
   */
  async retryFailedTasks(): Promise<number> {
    await getConnection();

    const failedTasks = await NotificationQueue.find({
      status: 'failed',
      retries: { $lt: 3 }, // Only retry if under max retries
    });

    let retried = 0;
    for (const task of failedTasks) {
      task.status = 'pending';
      task.scheduledFor = new Date();
      task.error = undefined;
      await task.save();
      retried++;
    }

    return retried;
  }
}

export default new NotificationQueueWorker();


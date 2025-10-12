import { IApplicationJourney } from '@/models/ApplicationJourney';

export interface JourneyAnalytics {
  estimatedTimeToCompletion: number; // in minutes
  averageStepTime: number; // in minutes
  completionRate: number; // percentage
  totalJourneys: number;
  completedJourneys: number;
}

export class JourneyAnalyticsService {
  /**
   * Calculate estimated time to completion for a journey
   */
  static calculateEstimatedTimeToCompletion(
    journey: IApplicationJourney,
    allJourneys: IApplicationJourney[]
  ): number {
    // Get completed journeys for analytics
    const completedJourneys = allJourneys.filter(j => j.status === 'completed' && j.journeyDuration);
    
    if (completedJourneys.length === 0) {
      // Default estimates if no historical data
      return this.getDefaultEstimatedTime(journey);
    }

    // Calculate average completion time
    const totalDuration = completedJourneys.reduce((sum, j) => sum + (j.journeyDuration || 0), 0);
    const averageDuration = totalDuration / completedJourneys.length;

    // Calculate current progress percentage
    const currentStep = journey.currentStep || 1;
    const totalSteps = 5;
    const progressPercentage = currentStep / totalSteps;

    // Estimate remaining time based on progress
    const estimatedTotalTime = averageDuration;
    const estimatedRemainingTime = estimatedTotalTime * (1 - progressPercentage);

    return Math.round(estimatedRemainingTime);
  }

  /**
   * Get default estimated time when no historical data is available
   */
  private static getDefaultEstimatedTime(journey: IApplicationJourney): number {
    const currentStep = journey.currentStep || 1;
    const remainingSteps = 5 - currentStep;

    // Default time estimates per step (in minutes)
    const stepEstimates = {
      1: 5,    // Add Job
      2: 30,   // Create CV
      3: 10,   // ATS Score
      4: 45,   // Cover Letter
      5: 5     // Download/Apply
    };

    let estimatedTime = 0;
    for (let step = currentStep; step <= 5; step++) {
      estimatedTime += stepEstimates[step as keyof typeof stepEstimates] || 10;
    }

    return estimatedTime;
  }

  /**
   * Calculate average step completion time
   */
  static calculateAverageStepTime(journeys: IApplicationJourney[]): number {
    const completedJourneys = journeys.filter(j => j.status === 'completed' && j.journeyDuration);
    
    if (completedJourneys.length === 0) return 0;

    const totalDuration = completedJourneys.reduce((sum, j) => sum + (j.journeyDuration || 0), 0);
    const totalSteps = completedJourneys.length * 5; // 5 steps per journey

    return Math.round(totalDuration / totalSteps);
  }

  /**
   * Calculate completion rate
   */
  static calculateCompletionRate(journeys: IApplicationJourney[]): number {
    if (journeys.length === 0) return 0;
    
    const completedCount = journeys.filter(j => j.status === 'completed').length;
    return Math.round((completedCount / journeys.length) * 100);
  }

  /**
   * Get comprehensive analytics for a user's journeys
   */
  static getJourneyAnalytics(journeys: IApplicationJourney[]): JourneyAnalytics {
    const completedJourneys = journeys.filter(j => j.status === 'completed');
    
    return {
      estimatedTimeToCompletion: 0, // Will be calculated per journey
      averageStepTime: this.calculateAverageStepTime(journeys),
      completionRate: this.calculateCompletionRate(journeys),
      totalJourneys: journeys.length,
      completedJourneys: completedJourneys.length
    };
  }

  /**
   * Format estimated time for display
   */
  static formatEstimatedTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) { // Less than 24 hours
      const hours = Math.round(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.round(minutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get journey progress insights
   */
  static getJourneyInsights(journey: IApplicationJourney, allJourneys: IApplicationJourney[]): {
    isAheadOfSchedule: boolean;
    isBehindSchedule: boolean;
    progressRate: number;
    estimatedCompletion: Date;
  } {
    const estimatedTime = this.calculateEstimatedTimeToCompletion(journey, allJourneys);
    const estimatedCompletion = new Date(Date.now() + estimatedTime * 60000);
    
    // Calculate progress rate based on time spent vs estimated
    const timeSpent = journey.lastWorkedOn ? 
      (Date.now() - new Date(journey.lastWorkedOn).getTime()) / 60000 : 0;
    const progressRate = estimatedTime > 0 ? (timeSpent / (timeSpent + estimatedTime)) * 100 : 0;

    return {
      isAheadOfSchedule: progressRate > 80,
      isBehindSchedule: progressRate < 20 && estimatedTime > 60, // More than 1 hour remaining and low progress
      progressRate: Math.min(progressRate, 100),
      estimatedCompletion
    };
  }
}

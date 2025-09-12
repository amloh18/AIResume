'use client';

import React, { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface PostOnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function PostOnboardingTour({ isActive, onComplete }: PostOnboardingTourProps) {
  const driverRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive) return;

    const driverObj = driver({
      showProgress: true,
      steps: [
        {
          element: '[data-tour="welcome"]',
          popover: {
            title: 'Welcome to CVCircle! 🎉',
            description: 'This is your dashboard where you can manage all your CVs and job applications. Let me show you around!',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="job-tracker"]',
          popover: {
            title: 'Track Your Opportunities',
            description: 'Here you can see all your job applications, their status, and track your progress. This is your central hub for managing your job search.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="cv-studio"]',
          popover: {
            title: 'Your CV Studio',
            description: 'This is where all your CVs and Cover Letters live. You can create new ones, edit existing ones, and choose from professional templates.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="cv-journey"]',
          popover: {
            title: 'Start a New Journey',
            description: 'Ready to apply? Click here to start a new CV Journey. We\'ll help you create a tailored CV and cover letter for any job.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="master-cv"]',
          popover: {
            title: 'Your Master CV',
            description: 'This is your comprehensive Master CV that you just created. You can duplicate it and customize it for specific jobs.',
            side: 'top',
            align: 'start'
          }
        }
      ],
      onDestroyed: () => {
        onComplete();
      }
    });

    driverRef.current = driverObj;
    driverObj.drive();

    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, [isActive, onComplete]);

  return null;
}

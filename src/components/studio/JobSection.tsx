'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, ExternalLink, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface JobSectionProps {
  jobData: any;
  onJobChange?: () => void;
}

export default function JobSection({ jobData, onJobChange }: JobSectionProps) {
  if (!jobData) {
    return (
      <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                No Job Selected
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select a job to optimize your CV
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {jobData.title || 'Learning & Development Coordinator'}
                </h3>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                  Linked from Journey
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{jobData.company || 'FutureWorks Inc'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{jobData.location || 'Remote'}</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {jobData.description || jobData.jobDescription || 
                  'We are looking for a Learning & Development Coordinator to join our team and help drive employee growth and development initiatives.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onJobChange}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Change Job
            </Button>
          </div>
        </div>

        {/* Job Details */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Experience Level:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {jobData.experienceLevel || 'Mid-level'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Employment Type:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {jobData.employmentType || 'Full-time'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Salary Range:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {jobData.salaryRange || 'Competitive'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Posted:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {jobData.postedDate || '2 days ago'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import React from 'react';
import { PenTool } from 'lucide-react';

const InkPadPage: React.FC = () => {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <PenTool size={24} className="text-lime-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Cover Letters</h2>
      <p className="text-white/60">Generate personalized cover letters for your job applications</p>
      <p className="text-white/40 text-sm mt-4">Coming soon...</p>
    </div>
  );
};

export default InkPadPage;

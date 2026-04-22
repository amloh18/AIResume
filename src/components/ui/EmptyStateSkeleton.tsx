import React from 'react';
import { Plus } from 'lucide-react';

interface EmptyStateSkeletonProps {
  onAdd: () => void;
  itemName: string;
}

export const EmptyStateSkeleton: React.FC<EmptyStateSkeletonProps> = ({ onAdd, itemName }) => {
  return (
    <div className="bg-white/5 border border-white/10 border-dashed rounded-none p-12 text-center relative group">
      <div className="max-w-md mx-auto">
        {/* Skeleton Bars */}
        <div className="flex flex-col gap-4 mb-8 opacity-50">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-white/10 rounded-full w-1/3"></div>
            <div className="h-4 bg-white/10 rounded-full w-1/4"></div>
          </div>
          <div className="h-4 bg-white/10 rounded-full w-1/2"></div>
          <div className="space-y-2 mt-4">
            <div className="h-3 bg-white/10 rounded-full w-full"></div>
            <div className="h-3 bg-white/10 rounded-full w-5/6"></div>
            <div className="h-3 bg-white/10 rounded-full w-4/6"></div>
          </div>
        </div>
        
        {/* The Hook */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <button
            onClick={onAdd}
            className="w-14 h-14 bg-[#80FF00] text-black rounded-full flex items-center justify-center hover:bg-[#70e600] hover:scale-105 transition-all shadow-[0_0_20px_rgba(128,255,0,0.3)] mb-4"
            aria-label={`Add ${itemName}`}
          >
            <Plus size={32} />
          </button>
          <p className="text-white/90 font-medium">Add your first {itemName} to unlock career analytics.</p>
        </div>
      </div>
    </div>
  );
};

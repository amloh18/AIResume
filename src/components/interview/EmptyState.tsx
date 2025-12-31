
import React from 'react';
import { motion } from 'framer-motion';
import { Mic, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
    onAction: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onAction }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center p-12 bg-gray-50 dark:bg-gray-800/30 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl"
        >
            <div className="w-20 h-20 mb-6 bg-lime-100 dark:bg-lime-900/20 rounded-full flex items-center justify-center">
                <Mic className="w-10 h-10 text-lime-600 dark:text-lime-400" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No Interview Sessions Yet
            </h2>

            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                Start by selecting a job from your tracker (Applied or Interview stage) to generate a personalized practice plan.
            </p>

            <button
                onClick={onAction}
                className="flex items-center gap-2 px-6 py-3 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-400 transition-all transform hover:scale-105"
            >
                <span>Go to Job Tracker</span>
                <ArrowRight className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export default EmptyState;

import { AlertCircle, RefreshCw } from 'lucide-react';

interface JobsErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function JobsErrorState({ message, onRetry }: JobsErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] glass-widget-premium rounded-xl p-8">
      <div className="p-4 rounded-full bg-red-500/20 mb-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
      </div>
      <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors duration-200"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}

interface MatchScoreBarProps {
  score: number;
}

export default function MatchScoreBar({ score }: MatchScoreBarProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-500', text: 'text-green-600' };
    if (score >= 60) return { bg: 'bg-lime-500', text: 'text-lime-600' };
    if (score >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
    if (score >= 20) return { bg: 'bg-orange-500', text: 'text-orange-600' };
    return { bg: 'bg-red-500', text: 'text-red-600' };
  };

  const colors = getScoreColor(score);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full ${colors.bg} transition-all duration-300`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <span className={`text-sm font-semibold ${colors.text} min-w-[40px]`}>
        {score}%
      </span>
    </div>
  );
}

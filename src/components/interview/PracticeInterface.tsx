
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lightbulb, Sparkles } from 'lucide-react';
import QuestionCard from './QuestionCard';
import AnswerEditor from './AnswerEditor';
import FeedbackPanel from './FeedbackPanel';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface PracticeInterfaceProps {
    question: any;
}

const PracticeInterface: React.FC<PracticeInterfaceProps> = ({ question: initialQuestion }) => {
    const router = useRouter();
    const [question, setQuestion] = useState(initialQuestion);
    const [analyzing, setAnalyzing] = useState(false);

    // Derived state
    const hasFeedback = !!question.aiFeedback;
    const isAnalyzed = question.userAnswer?.status === 'analyzed';

    const handleAnalyze = async (answerText: string) => {
        setAnalyzing(true);
        try {
            const res = await fetch('/api/interview/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: question._id,
                    answer: answerText
                })
            });
            const data = await res.json();

            if (data.success) {
                // Update local state with new feedback
                setQuestion({
                    ...question,
                    userAnswer: { ...question.userAnswer, text: answerText, status: 'analyzed' },
                    aiFeedback: data.feedback
                });
            }
        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Plan</span>
                </button>
                <div className="flex gap-2">
                    <span className={`px-3 py-1 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400 text-xs font-bold rounded-full border border-lime-200 dark:border-lime-800`}>
                        {question.content.difficulty?.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Main Content - Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Component Context (Instructions, Question, Tips) */}
                <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 p-6 overflow-y-auto hidden lg:block bg-white dark:bg-[#141810]">
                    <QuestionCard question={question} />
                </div>

                {/* Right: Work Area (Editor & Feedback) */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Mobile Question Card (visible only on small screens) */}
                    <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141810]">
                        <h2 className="font-bold text-lg mb-2">{question.content.question}</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                        <div className="max-w-3xl mx-auto space-y-8 pb-20">
                            <AnswerEditor
                                initialValue={question.userAnswer?.text || ''}
                                isAnalyzed={isAnalyzed}
                                onAnalyze={handleAnalyze}
                                isAnalyzing={analyzing}
                                questionId={question._id}
                            />

                            {hasFeedback && (
                                <FeedbackPanel feedback={question.aiFeedback} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PracticeInterface;

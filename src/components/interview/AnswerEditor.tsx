
import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, Loader2, Save } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface AnswerEditorProps {
    initialValue: string;
    isAnalyzed: boolean;
    onAnalyze: (text: string) => void;
    isAnalyzing: boolean;
    questionId: string;
}

const AnswerEditor: React.FC<AnswerEditorProps> = ({
    initialValue,
    isAnalyzed,
    onAnalyze,
    isAnalyzing,
    questionId
}) => {
    const [value, setValue] = useState(initialValue);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Auto-save logic
    const debouncedValue = useDebounce(value, 2000); // Wait 2s after typing stops
    const initialMount = useRef(true);

    useEffect(() => {
        if (initialMount.current) {
            initialMount.current = false;
            return;
        }

        const saveDraft = async () => {
            if (!debouncedValue || debouncedValue === initialValue && !lastSaved) return;
            setIsSaving(true);
            try {
                await fetch(`/api/interview/question/${questionId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ draft: debouncedValue })
                });
                setLastSaved(new Date());
            } catch (err) {
                console.error('Autosave failed', err);
            } finally {
                setIsSaving(false);
            }
        };

        saveDraft();
    }, [debouncedValue, questionId]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Your Answer</label>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    {isSaving ? (
                        <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>
                    ) : lastSaved ? (
                        <span className="flex items-center gap-1"><Save className="w-3 h-3" /> Saved {lastSaved.toLocaleTimeString()}</span>
                    ) : null}
                </div>
            </div>

            <div className="relative">
                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Type your answer here... try to use the STAR method (Situation, Task, Action, Result)"
                    className="w-full h-64 p-4 bg-white dark:bg-[#1a2015] border border-gray-200 dark:border-gray-800 rounded-2xl resize-none focus:ring-2 focus:ring-lime-500 outline-none transition-all text-base leading-relaxed dark:text-gray-200"
                    disabled={isAnalyzing}
                />

                {/* Analyze Button (Floating) */}
                <div className="absolute bottom-4 right-4">
                    <button
                        onClick={() => onAnalyze(value)}
                        disabled={!value.trim() || isAnalyzing}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all ${!value.trim() || isAnalyzing
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                : 'bg-lime-500 hover:bg-lime-400 text-black transform hover:scale-105 active:scale-95'
                            }`}
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <PlayCircle className="w-4 h-4" />
                                <span>{isAnalyzed ? 'Re-Analyze' : 'Analyze Answer'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnswerEditor;

/**
 * UndoRedoControls Component
 * 
 * UI controls for undo/redo functionality
 * Integrates with SyncEngine for real-time state management
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Undo2, Redo2, History } from 'lucide-react';

interface UndoRedoControlsProps {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    historyLength?: number;
    isSaving?: boolean;
    className?: string;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    historyLength = 0,
    isSaving = false,
    className = ''
}) => {
    return (
        <TooltipProvider>
            <div className={`flex items-center gap-2 ${className}`}>
                {/* Undo Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onUndo}
                            disabled={!canUndo || isSaving}
                            className="h-8 w-8 p-0"
                        >
                            <Undo2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Undo (Ctrl+Z)</p>
                    </TooltipContent>
                </Tooltip>

                {/* Redo Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onRedo}
                            disabled={!canRedo || isSaving}
                            className="h-8 w-8 p-0"
                        >
                            <Redo2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Redo (Ctrl+Y)</p>
                    </TooltipContent>
                </Tooltip>

                {/* History Indicator */}
                {historyLength > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <History className="h-3 w-3" />
                                <span>{historyLength}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{historyLength} changes in history</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Saving Indicator */}
                {isSaving && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
                        <span>Saving...</span>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
};

export default UndoRedoControls;

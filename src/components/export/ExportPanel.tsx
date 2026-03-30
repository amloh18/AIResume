'use client';

import React, { useState, useCallback } from 'react';
import { FileDown, FileText, Lock, Settings, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ExportOptions, ExportFormat, PaperSize, Orientation } from '@/lib/services/export-service';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { ExportService } from '@/lib/services/export-service';

interface ExportPanelProps {
  cvData: UnifiedCVDataStructure | null;
  template: ITemplate | null;
  onExport?: (result: any) => void;
  className?: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  cvData,
  template,
  onExport,
  className = '',
}) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleExport = useCallback(async () => {
    if (!cvData || !template) {
      setExportResult({ success: false, message: 'Missing CV data or template' });
      return;
    }

    setIsExporting(true);
    setExportResult(null);

    try {
      const options: ExportOptions = {
        format,
        paperSize,
        orientation,
      };

      const result = await ExportService.export(cvData, template, options);

      if (result.success && result.blob) {
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || 'resume.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportResult({ success: true, message: 'Export successful!' });
        if (onExport) onExport(result);
      } else {
        setExportResult({ success: false, message: result.error || 'Export failed' });
      }
    } catch (error) {
      setExportResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsExporting(false);
    }
  }, [cvData, template, format, paperSize, orientation, onExport]);

  const formatOptions = [
    { value: 'pdf', label: 'PDF', icon: FileDown, description: 'Best for sharing and printing' },
    { value: 'docx', label: 'DOCX', icon: FileText, description: 'Editable in Word' },
    { value: 'doc', label: 'DOC', icon: FileText, description: 'Legacy Word format' },
  ];

  const paperSizeOptions = [
    { value: 'A4', label: 'A4', description: 'Standard international (210×297mm)' },
    { value: 'Letter', label: 'Letter', description: 'US Standard (8.5×11in)' },
    { value: 'Legal', label: 'Legal', description: 'US Legal (8.5×14in)' },
  ];

  const orientationOptions = [
    { value: 'portrait', label: 'Portrait', description: 'Vertical layout' },
    { value: 'landscape', label: 'Landscape', description: 'Horizontal layout' },
  ];

  return (
    <div className={`export-panel bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <Download size={18} className="text-lime-600 dark:text-lime-400" />
        <span className="font-semibold">Export Resume</span>
      </div>

      <div className="p-4 space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Format</label>
          <div className="grid grid-cols-3 gap-2">
            {formatOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFormat(option.value as ExportFormat)}
                className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                  format === option.value
                    ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <option.icon size={20} className={format === option.value ? 'text-lime-600' : 'text-gray-500'} />
                <span className="mt-1 text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Paper Size */}
        <div>
          <label className="block text-sm font-medium mb-2">Paper Size</label>
          <div className="flex gap-2">
            {paperSizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPaperSize(option.value as PaperSize)}
                className={`flex-1 p-2 rounded-lg border text-center transition-all ${
                  paperSize === option.value
                    ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Orientation */}
        <div>
          <label className="block text-sm font-medium mb-2">Orientation</label>
          <div className="flex gap-2">
            {orientationOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setOrientation(option.value as Orientation)}
                className={`flex-1 p-2 rounded-lg border text-center transition-all ${
                  orientation === option.value
                    ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || !cvData || !template}
          className="w-full flex items-center justify-center gap-2 py-3 bg-lime-500 hover:bg-lime-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white dark:text-black font-medium rounded-lg transition-colors"
        >
          {isExporting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download size={18} />
              Export {format.toUpperCase()}
            </>
          )}
        </button>

        {/* Result Message */}
        {exportResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            exportResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {exportResult.success ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span className="text-sm">{exportResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportPanel;
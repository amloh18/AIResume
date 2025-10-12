'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DesignSettings } from '@/types/design-settings';
import { generateAccessibilityReport, validateDesignSettings } from '@/lib/accessibility-utils';
import { 
  Accessibility, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  RefreshCw,
  Eye,
  Palette,
  Type,
  AlertCircle
} from 'lucide-react';

interface AccessibilityReportProps {
  designSettings: DesignSettings;
  onSettingsChange?: (settings: Partial<DesignSettings>) => void;
  showRecommendations?: boolean;
}

const AccessibilityReport: React.FC<AccessibilityReportProps> = ({
  designSettings,
  onSettingsChange,
  showRecommendations = true
}) => {
  const [report, setReport] = useState<ReturnType<typeof generateAccessibilityReport> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateReport();
  }, [designSettings]);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const accessibilityReport = generateAccessibilityReport({
        primaryColor: designSettings.primaryColor,
        secondaryColor: designSettings.secondaryColor,
        backgroundColor: designSettings.backgroundColor || '#ffffff',
        fontFamily: designSettings.fontFamily,
        fontSize: designSettings.bodySize,
        lineHeight: designSettings.lineSpacing
      });
      setReport(accessibilityReport);
    } catch (error) {
      console.error('Failed to generate accessibility report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const getIssueIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getIssueBadgeVariant = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
    }
  };

  if (!report) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Accessibility Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Accessibility Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{report.score}</span>
                <span className="text-muted-foreground">/ 100</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {report.score >= 90 ? 'Excellent accessibility' : 
                 report.score >= 70 ? 'Good accessibility' : 
                 'Needs improvement'}
              </p>
            </div>
            <Badge variant={getScoreBadgeVariant(report.score)} className="text-lg px-3 py-1">
              {report.score >= 90 ? 'A' : 
               report.score >= 70 ? 'B' : 
               report.score >= 50 ? 'C' : 'D'}
            </Badge>
          </div>
          
          <Progress value={report.score} className="h-2" />
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateReport}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      {report.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Issues Found ({report.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.issues.map((issue, index) => (
              <Alert key={index} className="border-l-4 border-l-yellow-500">
                <div className="flex items-start gap-3">
                  {getIssueIcon(issue.type)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getIssueBadgeVariant(issue.type)} className="text-xs">
                        {issue.type.toUpperCase()}
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm">
                      {issue.message}
                    </AlertDescription>
                    {issue.recommendation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 {issue.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {showRecommendations && report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Fixes */}
      {report.score < 90 && onSettingsChange && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Quick Fixes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Improve contrast */}
              {report.issues.some(issue => issue.message.includes('contrast')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSettingsChange({
                    primaryColor: '#1f2937',
                    secondaryColor: '#6b7280'
                  })}
                  className="flex items-center gap-2"
                >
                  <Palette className="h-4 w-4" />
                  Use High Contrast Colors
                </Button>
              )}
              
              {/* Increase font size */}
              {report.issues.some(issue => issue.message.includes('font size')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSettingsChange({
                    bodySize: Math.max(14, designSettings.bodySize + 2)
                  })}
                  className="flex items-center gap-2"
                >
                  <Type className="h-4 w-4" />
                  Increase Font Size
                </Button>
              )}
              
              {/* Use accessible font */}
              {report.issues.some(issue => issue.message.includes('font')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSettingsChange({
                    fontFamily: 'Inter, system-ui, sans-serif'
                  })}
                  className="flex items-center gap-2"
                >
                  <Type className="h-4 w-4" />
                  Use Accessible Font
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {report.score >= 90 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Great! Your CV design meets accessibility standards. This will ensure it's readable for all users.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AccessibilityReport;

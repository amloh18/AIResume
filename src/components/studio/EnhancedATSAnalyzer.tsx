import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { EnhancedAIService, EnhancedATSResponse } from '@/lib/services/enhancedAIService';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Job } from '@/lib/stores/jobStore';

interface EnhancedATSAnalyzerProps {
  cvData: UnifiedCVDataStructure;
  jobData: Job | null;
  onScoreUpdate?: (score: number) => void;
}

export default function EnhancedATSAnalyzer({
  cvData,
  jobData,
  onScoreUpdate
}: EnhancedATSAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<EnhancedATSResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateOverallScore = useCallback((analysis: EnhancedATSResponse): number => {
    return Math.round(
      (analysis.keywordMatch * 0.3) +
      (analysis.experienceEducation * 0.2) +
      (analysis.actionVerbs * 0.15) +
      (analysis.skills * 0.25) +
      (analysis.formatting * 0.1)
    );
  }, []);

  const runAnalysis = async () => {
    if (!cvData) {
      setError('CV data is required for analysis');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await EnhancedAIService.generateComprehensiveATSAnalysis(cvData, jobData);
      setAnalysis(result);
      
      if (onScoreUpdate) {
        const overallScore = calculateOverallScore(result);
        onScoreUpdate(overallScore);
      }
    } catch (error) {
      console.error('ATS analysis error:', error);
      setError('Failed to analyze CV. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  if (!analysis) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Enhanced ATS Analyzer
          </CardTitle>
          <CardDescription>
            Get detailed, actionable feedback on your CV's ATS compatibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Analyze CV
              </>
            )}
          </Button>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const overallScore = calculateOverallScore(analysis);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Enhanced ATS Analysis
        </CardTitle>
        <CardDescription>
          Detailed breakdown of your CV's ATS compatibility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className="text-4xl font-bold mb-2">
            <span className={getScoreColor(overallScore)}>{overallScore}%</span>
          </div>
          <Badge variant={getScoreBadgeVariant(overallScore)} className="text-lg px-4 py-2">
            {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : 'Needs Improvement'}
          </Badge>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Keyword Match */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Keyword Match</span>
              <span className={`text-sm font-bold ${getScoreColor(analysis.keywordMatch)}`}>
                {analysis.keywordMatch}%
              </span>
            </div>
            <Progress value={analysis.keywordMatch} className="h-2" />
          </div>

          {/* Experience & Education */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Experience & Education</span>
              <span className={`text-sm font-bold ${getScoreColor(analysis.experienceEducation)}`}>
                {analysis.experienceEducation}%
              </span>
            </div>
            <Progress value={analysis.experienceEducation} className="h-2" />
          </div>

          {/* Action Verbs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Action Verbs</span>
              <span className={`text-sm font-bold ${getScoreColor(analysis.actionVerbs)}`}>
                {analysis.actionVerbs}%
              </span>
            </div>
            <Progress value={analysis.actionVerbs} className="h-2" />
          </div>

          {/* Skills Match */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Skills Match</span>
              <span className={`text-sm font-bold ${getScoreColor(analysis.skills)}`}>
                {analysis.skills}%
              </span>
            </div>
            <Progress value={analysis.skills} className="h-2" />
          </div>
        </div>

        {/* Keywords Analysis */}
        {analysis.matchedKeywords.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Matched Keywords ({analysis.matchedKeywords.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.matchedKeywords.slice(0, 10).map((keyword, index) => (
                <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis.missingKeywords.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Missing Keywords ({analysis.missingKeywords.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.missingKeywords.slice(0, 10).map((keyword, index) => (
                <Badge key={index} variant="destructive">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Actionable Recommendations</h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Re-analyze Button */}
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          variant="outline"
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Re-analyzing...
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Re-analyze CV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

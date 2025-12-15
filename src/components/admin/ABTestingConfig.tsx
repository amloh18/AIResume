'use client';

import React, { useState } from 'react';
import { Plus, X, TrendingUp, Eye, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ABTestVariant {
    id: string;
    subjectLine?: string;
    ctaText?: string;
}

interface ABTestConfig {
    enabled: boolean;
    testType: 'subject' | 'cta' | 'both';
    variants: ABTestVariant[];
    sampleSize: number; // Percentage (10-50%)
    testDuration: number; // Hours (1-48)
    winningMetric: 'opens' | 'clicks';
    winningVariantId?: string;
}

interface ABTestingConfigProps {
    config: ABTestConfig;
    onChange: (config: ABTestConfig) => void;
    baseSubjectLine?: string;
    baseCTAText?: string;
}

export default function ABTestingConfig({
    config,
    onChange,
    baseSubjectLine = '',
    baseCTAText = 'Click Here'
}: ABTestingConfigProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleToggleEnabled = (enabled: boolean) => {
        onChange({
            ...config,
            enabled,
            variants: enabled && config.variants.length === 0 ? [
                { id: 'variant-a', subjectLine: baseSubjectLine, ctaText: baseCTAText },
                { id: 'variant-b', subjectLine: '', ctaText: '' }
            ] : config.variants
        });
    };

    const handleAddVariant = () => {
        if (config.variants.length >= 3) return; // Max 3 variants

        const newVariant: ABTestVariant = {
            id: `variant-${String.fromCharCode(65 + config.variants.length)}`,
            subjectLine: config.testType === 'subject' || config.testType === 'both' ? '' : undefined,
            ctaText: config.testType === 'cta' || config.testType === 'both' ? '' : undefined
        };

        onChange({
            ...config,
            variants: [...config.variants, newVariant]
        });
    };

    const handleRemoveVariant = (variantId: string) => {
        if (config.variants.length <= 2) return; // Minimum 2 variants

        onChange({
            ...config,
            variants: config.variants.filter(v => v.id !== variantId)
        });
    };

    const handleUpdateVariant = (variantId: string, field: 'subjectLine' | 'ctaText', value: string) => {
        onChange({
            ...config,
            variants: config.variants.map(v =>
                v.id === variantId ? { ...v, [field]: value } : v
            )
        });
    };

    const handleTestTypeChange = (testType: 'subject' | 'cta' | 'both') => {
        onChange({
            ...config,
            testType,
            variants: config.variants.map(v => ({
                ...v,
                subjectLine: testType === 'subject' || testType === 'both' ? (v.subjectLine || '') : undefined,
                ctaText: testType === 'cta' || testType === 'both' ? (v.ctaText || '') : undefined
            }))
        });
    };

    const isValidConfig = () => {
        if (!config.enabled) return true;

        return config.variants.every(v => {
            if (config.testType === 'subject' || config.testType === 'both') {
                if (!v.subjectLine?.trim()) return false;
            }
            if (config.testType === 'cta' || config.testType === 'both') {
                if (!v.ctaText?.trim()) return false;
            }
            return true;
        });
    };

    if (!config.enabled) {
        return (
            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-semibold">A/B Testing</h4>
                            <p className="text-sm text-gray-400 mt-1">
                                Test different subject lines or CTA buttons to optimize performance
                            </p>
                        </div>
                        <Button
                            onClick={() => handleToggleEnabled(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Enable A/B Testing
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            <h4 className="text-white font-semibold">A/B Testing Configuration</h4>
                        </div>
                        <Button
                            onClick={() => handleToggleEnabled(false)}
                            variant="ghost"
                            className="text-gray-400 hover:text-white px-2 py-1 text-sm"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {/* Test Type */}
                        <div>
                            <Label className="text-gray-300">What to Test *</Label>
                            <Select value={config.testType} onValueChange={(value: any) => handleTestTypeChange(value)}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                    <SelectItem value="subject" className="text-white focus:bg-gray-800">
                                        Subject Line Only
                                    </SelectItem>
                                    <SelectItem value="cta" className="text-white focus:bg-gray-800">
                                        CTA Button Text Only
                                    </SelectItem>
                                    <SelectItem value="both" className="text-white focus:bg-gray-800">
                                        Both Subject Line & CTA
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Variants */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-gray-300">
                                    Test Variants ({config.variants.length}/3)
                                </Label>
                                {config.variants.length < 3 && (
                                    <Button
                                        onClick={handleAddVariant}
                                        variant="outline"
                                        className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 px-3 py-1.5 text-sm"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Variant
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {config.variants.map((variant, index) => (
                                    <Card key={variant.id} className="bg-gray-800 border-gray-700">
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="text-sm font-semibold text-blue-400">
                                                    Variant {String.fromCharCode(65 + index)}
                                                </span>
                                                {config.variants.length > 2 && (
                                                    <Button
                                                        onClick={() => handleRemoveVariant(variant.id)}
                                                        variant="ghost"
                                                        className="text-gray-400 hover:text-red-400 h-6 w-6 p-0"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                {(config.testType === 'subject' || config.testType === 'both') && (
                                                    <div>
                                                        <Label className="text-gray-400 text-xs">Subject Line</Label>
                                                        <Input
                                                            value={variant.subjectLine || ''}
                                                            onChange={(e) => handleUpdateVariant(variant.id, 'subjectLine', e.target.value)}
                                                            placeholder={`Subject line for variant ${String.fromCharCode(65 + index)}...`}
                                                            className="bg-gray-900 border-gray-700 text-white mt-1 text-sm"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {variant.subjectLine?.length || 0} chars (optimal: 40-50)
                                                        </p>
                                                    </div>
                                                )}

                                                {(config.testType === 'cta' || config.testType === 'both') && (
                                                    <div>
                                                        <Label className="text-gray-400 text-xs">CTA Button Text</Label>
                                                        <Input
                                                            value={variant.ctaText || ''}
                                                            onChange={(e) => handleUpdateVariant(variant.id, 'ctaText', e.target.value)}
                                                            placeholder={`CTA text for variant ${String.fromCharCode(65 + index)}...`}
                                                            className="bg-gray-900 border-gray-700 text-white mt-1 text-sm"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Test Configuration */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-gray-300">Sample Size *</Label>
                                <Select
                                    value={config.sampleSize.toString()}
                                    onValueChange={(value) => onChange({ ...config, sampleSize: parseInt(value) })}
                                >
                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                        <SelectItem value="10" className="text-white focus:bg-gray-800">10% of audience</SelectItem>
                                        <SelectItem value="20" className="text-white focus:bg-gray-800">20% of audience</SelectItem>
                                        <SelectItem value="30" className="text-white focus:bg-gray-800">30% of audience</SelectItem>
                                        <SelectItem value="50" className="text-white focus:bg-gray-800">50% of audience</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Portion of audience to test on
                                </p>
                            </div>

                            <div>
                                <Label className="text-gray-300">Test Duration *</Label>
                                <Select
                                    value={config.testDuration.toString()}
                                    onValueChange={(value) => onChange({ ...config, testDuration: parseInt(value) })}
                                >
                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                        <SelectItem value="2" className="text-white focus:bg-gray-800">2 hours</SelectItem>
                                        <SelectItem value="4" className="text-white focus:bg-gray-800">4 hours</SelectItem>
                                        <SelectItem value="8" className="text-white focus:bg-gray-800">8 hours</SelectItem>
                                        <SelectItem value="24" className="text-white focus:bg-gray-800">24 hours</SelectItem>
                                        <SelectItem value="48" className="text-white focus:bg-gray-800">48 hours</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Before sending to remainder
                                </p>
                            </div>
                        </div>

                        <div>
                            <Label className="text-gray-300">Winning Metric *</Label>
                            <Select
                                value={config.winningMetric}
                                onValueChange={(value: any) => onChange({ ...config, winningMetric: value })}
                            >
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                                    <SelectItem value="opens" className="text-white focus:bg-gray-800">
                                        Highest Open Rate
                                    </SelectItem>
                                    <SelectItem value="clicks" className="text-white focus:bg-gray-800">
                                        Highest Click-Through Rate
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                How to determine the winning variant
                            </p>
                        </div>
                    </div>

                    {!isValidConfig() && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-300">
                                Please fill in all variant fields before proceeding.
                            </p>
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-300">
                            <strong>How it works:</strong> The test will send {config.sampleSize}% of emails split equally among variants.
                            After {config.testDuration} hours, the variant with the highest {config.winningMetric === 'opens' ? 'open rate' : 'click-through rate'}
                            will be sent to the remaining {100 - config.sampleSize}% of recipients.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

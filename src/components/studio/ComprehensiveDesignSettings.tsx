'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DesignSettings, SectionConfig } from '@/types/design-settings';
import { RotateCcw, Palette, Type, Layout, Settings } from 'lucide-react';

interface ComprehensiveDesignSettingsProps {
  onSettingsChange: (settings: DesignSettings) => void;
  onSectionConfigChange: (config: SectionConfig) => void;
  initialSettings?: Partial<DesignSettings>;
  initialSectionConfig?: Partial<SectionConfig>;
  templateOverrides?: Partial<DesignSettings>;
}

const ComprehensiveDesignSettings: React.FC<ComprehensiveDesignSettingsProps> = ({
  onSettingsChange,
  onSectionConfigChange,
  initialSettings,
  initialSectionConfig,
  templateOverrides
}) => {
  // Design settings state
  const [designSettings, setDesignSettings] = useState<DesignSettings>({
    fontFamily: 'Inter, system-ui, sans-serif',
    headerSize: 24,
    bodySize: 14,
    sectionSize: 18,
    lineSpacing: 1.2,
    textAlignment: 'left',
    layoutType: 'single-column',
    colorTheme: 'BlackBlack',
    pageSize: 'A4',
    pagePadding: { top: 32, bottom: 32, left: 32, right: 32 },
    ...initialSettings
  });

  // Section configuration state
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    order: ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'],
    visibility: {},
    skillsRenderingStyle: 'chip',
    ...initialSectionConfig
  });

  // Apply template overrides when they change
  useEffect(() => {
    if (templateOverrides) {
      setDesignSettings(prev => ({ ...prev, ...templateOverrides }));
    }
  }, [templateOverrides]);

  // Notify parent components of changes
  useEffect(() => {
    onSettingsChange(designSettings);
  }, [designSettings, onSettingsChange]);

  useEffect(() => {
    onSectionConfigChange(sectionConfig);
  }, [sectionConfig, onSectionConfigChange]);

  const updateDesignSetting = (key: keyof DesignSettings, value: any) => {
    setDesignSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateSectionConfig = (key: keyof SectionConfig, value: any) => {
    setSectionConfig(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setDesignSettings({
      fontFamily: 'Inter, system-ui, sans-serif',
      headerSize: 24,
      bodySize: 14,
      sectionSize: 18,
      lineSpacing: 1.2,
      textAlignment: 'left',
      layoutType: 'single-column',
      colorTheme: 'BlackBlack',
      pageSize: 'A4',
      pagePadding: { top: 32, bottom: 32, left: 32, right: 32 }
    });
    
    setSectionConfig({
      order: ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'],
      visibility: {},
      skillsRenderingStyle: 'chip'
    });
  };

  const fontOptions = [
    { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
    { value: 'Roboto, sans-serif', label: 'Roboto' },
    { value: 'Open Sans, sans-serif', label: 'Open Sans' },
    { value: 'Lato, sans-serif', label: 'Lato' },
    { value: 'Poppins, sans-serif', label: 'Poppins' },
    { value: 'Montserrat, sans-serif', label: 'Montserrat' },
    { value: 'Source Sans Pro, sans-serif', label: 'Source Sans Pro' },
    { value: 'Nunito, sans-serif', label: 'Nunito' }
  ];

  const colorThemes = [
    { value: 'BlackBlack', label: 'Black & Black', colors: ['#000000', '#000000'] },
    { value: 'Charcoal Black', label: 'Charcoal Black', colors: ['#1f2937', '#374151'] },
    { value: 'GrayBlack', label: 'Gray & Black', colors: ['#374151', '#6b7280'] },
    { value: 'Blue Black', label: 'Blue & Black', colors: ['#1e40af', '#3b82f6'] },
    { value: 'custom', label: 'Custom', colors: ['#1f2937', '#6b7280'] }
  ];

  const skillsRenderingStyles = [
    { value: 'chip', label: 'Chip Style', description: 'Skills as rounded chips' },
    { value: 'inline', label: 'Inline Comma-separated', description: 'Skills in a single line' },
    { value: 'bulleted', label: 'Bulleted List', description: 'Each skill as a bullet point' }
  ];

  return (
    <div className="space-y-6">
      {/* Typography Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Font Family */}
          <div className="space-y-2">
            <Label htmlFor="font-family">Font Family</Label>
            <Select
              value={designSettings.fontFamily}
              onValueChange={(value) => updateDesignSetting('fontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Sizes */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="header-size">Header Size</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  value={[designSettings.headerSize]}
                  onValueChange={([value]) => updateDesignSetting('headerSize', value)}
                  min={16}
                  max={32}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="outline" className="min-w-[3rem] text-center">
                  {designSettings.headerSize}px
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body-size">Body Size</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  value={[designSettings.bodySize]}
                  onValueChange={([value]) => updateDesignSetting('bodySize', value)}
                  min={10}
                  max={18}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="outline" className="min-w-[3rem] text-center">
                  {designSettings.bodySize}px
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-size">Section Size</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  value={[designSettings.sectionSize]}
                  onValueChange={([value]) => updateDesignSetting('sectionSize', value)}
                  min={14}
                  max={24}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="outline" className="min-w-[3rem] text-center">
                  {designSettings.sectionSize}px
                </Badge>
              </div>
            </div>
          </div>

          {/* Line Spacing */}
          <div className="space-y-2">
            <Label htmlFor="line-spacing">Line Spacing</Label>
            <div className="flex items-center space-x-2">
              <Slider
                value={[designSettings.lineSpacing]}
                onValueChange={([value]) => updateDesignSetting('lineSpacing', value)}
                min={1.0}
                max={2.0}
                step={0.1}
                className="flex-1"
              />
              <Badge variant="outline" className="min-w-[3rem] text-center">
                {designSettings.lineSpacing}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Layout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Layout Type */}
          <div className="space-y-2">
            <Label htmlFor="layout-type">Layout Type</Label>
            <Select
              value={designSettings.layoutType}
              onValueChange={(value: 'single-column' | 'two-column') => updateDesignSetting('layoutType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single-column">Single Column</SelectItem>
                <SelectItem value="two-column">Two Column</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Alignment */}
          <div className="space-y-2">
            <Label htmlFor="text-alignment">Text Alignment</Label>
            <Select
              value={designSettings.textAlignment}
              onValueChange={(value: 'left' | 'center' | 'right') => updateDesignSetting('textAlignment', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page Size */}
          <div className="space-y-2">
            <Label htmlFor="page-size">Page Size</Label>
            <Select
              value={designSettings.pageSize}
              onValueChange={(value: 'A4' | 'Letter') => updateDesignSetting('pageSize', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                <SelectItem value="Letter">Letter (216 × 279 mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Color Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="color-theme">Color Theme</Label>
            <Select
              value={designSettings.colorTheme}
              onValueChange={(value) => updateDesignSetting('colorTheme', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select color theme" />
              </SelectTrigger>
              <SelectContent>
                {colorThemes.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {theme.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {theme.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Section Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Skills Rendering Style */}
          <div className="space-y-2">
            <Label htmlFor="skills-rendering">Skills Rendering Style</Label>
            <Select
              value={sectionConfig.skillsRenderingStyle}
              onValueChange={(value: 'chip' | 'inline' | 'bulleted') => updateSectionConfig('skillsRenderingStyle', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select skills style" />
              </SelectTrigger>
              <SelectContent>
                {skillsRenderingStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    <div>
                      <div className="font-medium">{style.label}</div>
                      <div className="text-sm text-muted-foreground">{style.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
};

export default ComprehensiveDesignSettings;

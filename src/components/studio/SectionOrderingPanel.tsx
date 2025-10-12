'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SectionConfig } from '@/types/design-settings';
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw,
  Settings,
  User,
  Briefcase,
  GraduationCap,
  Code,
  FolderOpen,
  Award,
  Globe
} from 'lucide-react';

interface SectionOrderingPanelProps {
  onSectionConfigChange: (config: SectionConfig) => void;
  initialConfig?: Partial<SectionConfig>;
}

const SectionOrderingPanel: React.FC<SectionOrderingPanelProps> = ({
  onSectionConfigChange,
  initialConfig
}) => {
  // Section configuration state
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    order: ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'],
    visibility: {},
    skillsRenderingStyle: 'chip',
    ...initialConfig
  });

  // Section definitions with metadata
  const sectionDefinitions = [
    {
      key: 'personal_header',
      label: 'Personal Information',
      icon: User,
      description: 'Name, contact details, and professional summary',
      defaultVisible: true
    },
    {
      key: 'work_experience',
      label: 'Work Experience',
      icon: Briefcase,
      description: 'Professional work history and achievements',
      defaultVisible: true
    },
    {
      key: 'education',
      label: 'Education',
      icon: GraduationCap,
      description: 'Academic qualifications and degrees',
      defaultVisible: true
    },
    {
      key: 'skills',
      label: 'Skills',
      icon: Code,
      description: 'Technical and professional skills',
      defaultVisible: true
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: FolderOpen,
      description: 'Personal and professional projects',
      defaultVisible: true
    },
    {
      key: 'certificates',
      label: 'Certificates',
      icon: Award,
      description: 'Professional certifications and awards',
      defaultVisible: true
    },
    {
      key: 'languages',
      label: 'Languages',
      icon: Globe,
      description: 'Language proficiencies',
      defaultVisible: true
    }
  ];

  // Notify parent component of changes
  useEffect(() => {
    onSectionConfigChange(sectionConfig);
  }, [sectionConfig, onSectionConfigChange]);

  const moveSection = (fromIndex: number, toIndex: number) => {
    const newOrder = [...sectionConfig.order];
    const [movedSection] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedSection);
    
    setSectionConfig(prev => ({
      ...prev,
      order: newOrder
    }));
  };

  const toggleSectionVisibility = (sectionKey: string) => {
    setSectionConfig(prev => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [sectionKey]: !prev.visibility[sectionKey]
      }
    }));
  };

  const isSectionVisible = (sectionKey: string) => {
    return sectionConfig.visibility[sectionKey] !== false;
  };

  const resetToDefaults = () => {
    setSectionConfig({
      order: ['personal_header', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages'],
      visibility: {},
      skillsRenderingStyle: 'chip'
    });
  };

  const getSectionDefinition = (sectionKey: string) => {
    return sectionDefinitions.find(def => def.key === sectionKey);
  };

  return (
    <div className="space-y-6">
      {/* Section Ordering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Section Order & Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Drag to reorder sections</Label>
            <div className="space-y-2">
              {sectionConfig.order.map((sectionKey, index) => {
                const sectionDef = getSectionDefinition(sectionKey);
                if (!sectionDef) return null;

                const Icon = sectionDef.icon;
                const isVisible = isSectionVisible(sectionKey);

                return (
                  <div
                    key={sectionKey}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Section Icon */}
                    <Icon className="h-5 w-5 text-muted-foreground" />

                    {/* Section Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sectionDef.label}</span>
                        {!isVisible && (
                          <Badge variant="secondary" className="text-xs">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {sectionDef.description}
                      </p>
                    </div>

                    {/* Visibility Toggle */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isVisible}
                        onCheckedChange={() => toggleSectionVisibility(sectionKey)}
                        id={`visibility-${sectionKey}`}
                      />
                      <Label htmlFor={`visibility-${sectionKey}`} className="sr-only">
                        Toggle {sectionDef.label} visibility
                      </Label>
                    </div>

                    {/* Move Buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSection(index, Math.max(0, index - 1))}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSection(index, Math.min(sectionConfig.order.length - 1, index + 1))}
                        disabled={index === sectionConfig.order.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Visibility Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibility Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {sectionDefinitions.map((sectionDef) => {
              const isVisible = isSectionVisible(sectionDef.key);
              const Icon = sectionDef.icon;
              
              return (
                <div
                  key={sectionDef.key}
                  className={`flex items-center gap-2 p-2 rounded border ${
                    isVisible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isVisible ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`text-sm font-medium ${isVisible ? 'text-green-800' : 'text-red-800'}`}>
                    {sectionDef.label}
                  </span>
                  {isVisible ? (
                    <Eye className="h-3 w-3 text-green-600" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-red-600" />
                  )}
                </div>
              );
            })}
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

export default SectionOrderingPanel;

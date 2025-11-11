'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Send, Calendar, Target, Mail, FileText, ChevronRight, ChevronLeft, CheckCircle, Settings, Users, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CampaignFilters from './CampaignFilters';
import { campaignTemplates, CampaignTemplate } from '@/lib/campaign-templates';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Campaign {
  _id?: string;
  campaignName: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  targetFilters: any;
  targetedUserCount?: number;
  scheduledAt?: string;
  tags?: string[];
  notes?: string;
  campaignType?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  previewText?: string;
  templateId?: string;
  sendType?: 'now' | 'scheduled' | 'recurring';
  sendDate?: string;
  sendTime?: string;
  timezone?: string;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  recurringEndDate?: string;
  campaignGoal?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

interface Props {
  campaign: Campaign | null;
  onClose: () => void;
  onSave: () => void;
}

type Step = 'setup' | 'content' | 'schedule' | 'review';

export default function CampaignEditor({ campaign, onClose, onSave }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(!campaign);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [targetedCount, setTargetedCount] = useState(0);
  const [previewingTargets, setPreviewingTargets] = useState(false);
  const [testEmails, setTestEmails] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState<CampaignTemplate[]>(campaignTemplates);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');
  const [isTargetAudienceExpanded, setIsTargetAudienceExpanded] = useState(false);
  
  const [formData, setFormData] = useState<Campaign>({
    campaignName: '',
    subject: '',
    htmlContent: '',
    plainTextContent: '',
    status: 'draft',
    targetFilters: {},
    tags: [],
    notes: '',
    campaignType: 'marketing',
    fromName: 'CVCircle Team',
    fromEmail: 'noreply@cvcircle.io',
    replyTo: 'support@cvcircle.io',
    previewText: '',
    sendType: 'now',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    campaignGoal: 'clicks',
    utmSource: 'email',
    utmMedium: 'campaign',
  });

  useEffect(() => {
    if (campaign) {
      setFormData(campaign);
      if (campaign.targetedUserCount) {
        setTargetedCount(campaign.targetedUserCount);
      }
      if (campaign.templateId) {
        const template = campaignTemplates.find(t => t.id === campaign.templateId);
        if (template) {
          setSelectedTemplate(template);
          setShowTemplateSelector(false);
        }
      }
    }
  }, [campaign]);

  useEffect(() => {
    if (selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        subject: selectedTemplate.subjectTemplate,
        previewText: selectedTemplate.previewText || '',
        htmlContent: selectedTemplate.htmlContent,
        fromName: selectedTemplate.defaultFromName || prev.fromName,
        fromEmail: selectedTemplate.defaultFromEmail || prev.fromEmail,
        replyTo: selectedTemplate.defaultReplyTo || prev.replyTo,
        campaignType: selectedTemplate.category,
        templateId: selectedTemplate.id,
        targetFilters: selectedTemplate.suggestedFilters || prev.targetFilters
      }));
    }
  }, [selectedTemplate]);

  // Auto-update targeted count when filters change
  useEffect(() => {
    if (Object.keys(formData.targetFilters).length > 0) {
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        handlePreviewTargets();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setTargetedCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.targetFilters]);

  const handleInputChange = (field: keyof Campaign, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
  };

  const handlePreviewTargets = async () => {
    setPreviewingTargets(true);
    try {
      const response = await fetch('/api/admin/email-campaigns/preview-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFilters: formData.targetFilters, limit: 10 }),
      });

      // Check if response is ok and has content
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview targets API error:', response.status, errorText);
        alert(`Failed to preview targets: ${response.status} ${response.statusText}`);
        setPreviewingTargets(false);
        return;
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        console.error('Non-JSON response from preview-targets:', errorText);
        alert('Invalid response from server. Please try again.');
        setPreviewingTargets(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTargetedCount(data.totalCount || 0);
        if (data.users && data.users.length > 0) {
          console.log('Preview users:', data.users);
        }
      } else {
        alert(`Failed to preview targets: ${data.error || 'Unknown error'}`);
        setTargetedCount(0);
      }
    } catch (error: any) {
      console.error('Failed to preview targets:', error);
      alert(`Error: ${error.message || 'Failed to preview targets. Please try again.'}`);
      setTargetedCount(0);
    } finally {
      setPreviewingTargets(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmails.trim()) {
      alert('Please enter test email addresses');
      return;
    }

    const emailList = testEmails.split(',').map(e => e.trim()).filter(Boolean);
    // Implementation for sending test emails
    alert(`Test emails would be sent to: ${emailList.join(', ')}`);
  };

  const handleSave = async (status: 'draft' | 'scheduled') => {
    // Validation
    if (!formData.campaignName || formData.campaignName.length < 5) {
      alert('Campaign name must be at least 5 characters');
      return;
    }
    if (!formData.subject) {
      alert('Subject line is required');
      return;
    }
    if (!formData.htmlContent) {
      alert('Email content is required');
      return;
    }
    if (!formData.fromName || !formData.fromEmail) {
      alert('Sender information is required');
      return;
    }
    if (Object.keys(formData.targetFilters).length === 0) {
      alert('Please configure target audience');
      return;
    }

    setLoading(true);
    try {
      const url = campaign?._id
        ? `/api/admin/email-campaigns/${campaign._id}`
        : '/api/admin/email-campaigns';
      
      const method = campaign?._id ? 'PUT' : 'POST';

      // Determine scheduled date/time if needed
      let scheduledAt = undefined;
      if (formData.sendType === 'scheduled' && formData.sendDate && formData.sendTime) {
        const [hours, minutes] = formData.sendTime.split(':');
        const date = new Date(formData.sendDate);
        date.setHours(parseInt(hours), parseInt(minutes));
        scheduledAt = date.toISOString();
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          status,
          scheduledAt,
          targetedUserCount: targetedCount
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        alert('Campaign saved successfully!');
        onSave();
      } else {
        alert('Failed to save campaign: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save campaign:', error);
      alert('Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'setup', label: 'Setup & Audience', icon: <Settings className="w-4 h-4" /> },
    { id: 'content', label: 'Content & Design', icon: <FileText className="w-4 h-4" /> },
    { id: 'schedule', label: 'Schedule & Goals', icon: <Calendar className="w-4 h-4" /> },
    { id: 'review', label: 'Review & Send', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const canProceed = () => {
    switch (currentStep) {
      case 'setup':
        return formData.campaignName.length >= 5 && 
               formData.fromName && 
               formData.fromEmail &&
               Object.keys(formData.targetFilters).length > 0;
      case 'content':
        return formData.subject && formData.htmlContent;
      case 'schedule':
        return true; // Schedule is optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (!canProceed()) {
      alert('Please complete all required fields before proceeding');
      return;
    }
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const filteredTemplates = templateCategoryFilter === 'all' 
    ? availableTemplates 
    : availableTemplates.filter(t => t.category === templateCategoryFilter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-7xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {campaign ? 'Edit Campaign' : 'Create Email Campaign'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {campaign ? 'Update your email campaign' : 'Create engaging email campaigns for your users'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 py-4 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      currentStepIndex >= index
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-600 text-gray-400'
                    }`}>
                      {currentStepIndex > index ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <span className={`ml-2 text-sm ${
                      currentStep === step.id ? 'text-white font-medium' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-600 mx-2" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {currentStep === 'setup' && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Template Selection */}
                  {showTemplateSelector && !campaign && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Select a Template</h3>
                      <div className="mb-4">
                        <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                          <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Filter by category" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700 text-white">
                            <SelectItem value="all" className="text-white focus:bg-gray-800">All Categories</SelectItem>
                            <SelectItem value="marketing" className="text-white focus:bg-gray-800">Marketing</SelectItem>
                            <SelectItem value="promotional" className="text-white focus:bg-gray-800">Promotional</SelectItem>
                            <SelectItem value="announcement" className="text-white focus:bg-gray-800">Announcement</SelectItem>
                            <SelectItem value="newsletter" className="text-white focus:bg-gray-800">Newsletter</SelectItem>
                            <SelectItem value="transactional" className="text-white focus:bg-gray-800">Transactional</SelectItem>
                            <SelectItem value="automated" className="text-white focus:bg-gray-800">Automated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                        {filteredTemplates.map((template) => (
                          <Card
                            key={template.id}
                            className="bg-gray-800 border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="text-white font-semibold">{template.name}</h4>
                                  <p className="text-gray-400 text-sm mt-1">{template.description}</p>
                                </div>
                                <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                                  {template.category}
                                </span>
                              </div>
                              <div className="mt-3 text-xs text-gray-500">
                                Scenario: {template.scenario.replace('_', ' ')}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setShowTemplateSelector(false)}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          Start from scratch instead
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Target Audience - Collapsible at Top */}
                  <div className="mb-6">
                    <button
                      onClick={() => setIsTargetAudienceExpanded(!isTargetAudienceExpanded)}
                      className="w-full flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition-colors"
                    >
                      <h3 className="text-lg font-semibold text-white">Target Audience *</h3>
                      {isTargetAudienceExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    
                    {isTargetAudienceExpanded && (
                      <div className="mt-4">
                        <CampaignFilters
                          filters={formData.targetFilters}
                          onChange={(filters) => handleInputChange('targetFilters', filters)}
                          twoColumn={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* Two Column Layout */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Column 1: Campaign Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Campaign Details</h3>
                      
                      <div>
                        <Label className="text-gray-300">Campaign Name *</Label>
                        <Input
                          value={formData.campaignName}
                          onChange={(e) => handleInputChange('campaignName', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="e.g., Summer Promotion 2024"
                          minLength={5}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.campaignName.length}/5 min characters
                        </p>
                      </div>

                      <div>
                        <Label className="text-gray-300">Campaign Description</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="Internal notes about campaign purpose and goals..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label className="text-gray-300">Campaign Type *</Label>
                        <Select 
                          value={formData.campaignType} 
                          onValueChange={(value) => handleInputChange('campaignType', value)}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700 text-white">
                            <SelectItem value="marketing" className="text-white focus:bg-gray-800">Marketing</SelectItem>
                            <SelectItem value="newsletter" className="text-white focus:bg-gray-800">Newsletter</SelectItem>
                            <SelectItem value="promotional" className="text-white focus:bg-gray-800">Promotional</SelectItem>
                            <SelectItem value="announcement" className="text-white focus:bg-gray-800">Announcement</SelectItem>
                            <SelectItem value="transactional" className="text-white focus:bg-gray-800">Transactional</SelectItem>
                            <SelectItem value="automated" className="text-white focus:bg-gray-800">Automated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Column 2: Sender Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Sender Information</h3>
                      
                      <div>
                        <Label className="text-gray-300">From Name *</Label>
                        <Input
                          value={formData.fromName}
                          onChange={(e) => handleInputChange('fromName', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="e.g., CVCircle Team"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.fromName?.length || 0} characters
                        </p>
                      </div>

                      <div>
                        <Label className="text-gray-300">From Email Address *</Label>
                        <Input
                          type="email"
                          value={formData.fromEmail}
                          onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="e.g., noreply@cvcircle.io"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-300">Reply-To Email</Label>
                        <Input
                          type="email"
                          value={formData.replyTo}
                          onChange={(e) => handleInputChange('replyTo', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="e.g., support@cvcircle.io"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Estimated Recipients */}
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    {/* Estimated Recipients */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Estimated Recipients</div>
                          <div className="text-2xl font-bold text-blue-400">{targetedCount}</div>
                        </div>
                        <button
                          onClick={handlePreviewTargets}
                          disabled={previewingTargets}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Eye className="w-4 h-4" />
                          {previewingTargets ? 'Loading...' : 'Preview Users'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 'content' && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Email Content</h3>
                    <div className="flex items-center gap-2">
                      {selectedTemplate && (
                        <button
                          onClick={() => setShowTemplateSelector(true)}
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          Change Template
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        {previewMode ? 'Edit' : 'Preview'}
                      </button>
                    </div>
                  </div>

                  {previewMode ? (
                    <div
                      className="w-full min-h-[400px] p-6 bg-white border border-gray-700 rounded-lg"
                      dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
                    />
                  ) : (
                    <>
                      <div>
                        <Label className="text-gray-300">Email Subject Line *</Label>
                        <Input
                          value={formData.subject}
                          onChange={(e) => handleInputChange('subject', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="e.g., Get 50% off your premium subscription!"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.subject.length} characters (recommended: 40-50)
                        </p>
                      </div>

                      <div>
                        <Label className="text-gray-300">Preview Text / Pre-header</Label>
                        <Input
                          value={formData.previewText}
                          onChange={(e) => handleInputChange('previewText', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="Secondary subject line visible in inbox preview"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.previewText?.length || 0} characters (recommended: 85-100)
                        </p>
                      </div>

                      <div>
                        <Label className="text-gray-300">HTML Content *</Label>
                        <Textarea
                          value={formData.htmlContent}
                          onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                          rows={15}
                          className="bg-gray-800 border-gray-700 text-white mt-1 font-mono text-sm"
                          placeholder="<html>...</html>"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-300">Plain Text Version (Optional)</Label>
                        <Textarea
                          value={formData.plainTextContent}
                          onChange={(e) => handleInputChange('plainTextContent', e.target.value)}
                          rows={6}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="Plain text version for email clients that don't support HTML..."
                        />
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {currentStep === 'schedule' && (
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-white">Scheduling Options</h3>

                  <div>
                    <Label className="text-gray-300">Send Type *</Label>
                    <div className="mt-2 space-y-2">
                      {['now', 'scheduled', 'recurring'].map((type) => (
                        <label key={type} className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-750">
                          <input
                            type="radio"
                            name="sendType"
                            value={type}
                            checked={formData.sendType === type}
                            onChange={(e) => handleInputChange('sendType', e.target.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-white capitalize">{type === 'now' ? 'Send Now' : type === 'scheduled' ? 'Schedule for Later' : 'Recurring Campaign'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.sendType === 'scheduled' && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Send Date *</Label>
                        <Input
                          type="date"
                          value={formData.sendDate}
                          onChange={(e) => handleInputChange('sendDate', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Send Time *</Label>
                        <Input
                          type="time"
                          value={formData.sendTime}
                          onChange={(e) => handleInputChange('sendTime', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Timezone</Label>
                        <Input
                          value={formData.timezone}
                          onChange={(e) => handleInputChange('timezone', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {formData.sendType === 'recurring' && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Frequency *</Label>
                        <Select 
                          value={formData.recurringFrequency} 
                          onValueChange={(value) => handleInputChange('recurringFrequency', value)}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700 text-white">
                            <SelectItem value="daily" className="text-white focus:bg-gray-800">Daily</SelectItem>
                            <SelectItem value="weekly" className="text-white focus:bg-gray-800">Weekly</SelectItem>
                            <SelectItem value="monthly" className="text-white focus:bg-gray-800">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-gray-300">Start Date *</Label>
                        <Input
                          type="date"
                          value={formData.sendDate}
                          onChange={(e) => handleInputChange('sendDate', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">End Date (Optional)</Label>
                        <Input
                          type="date"
                          value={formData.recurringEndDate}
                          onChange={(e) => handleInputChange('recurringEndDate', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          min={formData.sendDate}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 mt-6">
                    <h3 className="text-lg font-semibold text-white">Goals and Tracking</h3>
                    
                    <div>
                      <Label className="text-gray-300">Campaign Goal</Label>
                      <Select 
                        value={formData.campaignGoal} 
                        onValueChange={(value) => handleInputChange('campaignGoal', value)}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                          <SelectItem value="clicks" className="text-white focus:bg-gray-800">Clicks</SelectItem>
                          <SelectItem value="conversions" className="text-white focus:bg-gray-800">Conversions</SelectItem>
                          <SelectItem value="opens" className="text-white focus:bg-gray-800">Opens</SelectItem>
                          <SelectItem value="signups" className="text-white focus:bg-gray-800">Signups</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-300">UTM Source</Label>
                        <Input
                          value={formData.utmSource}
                          onChange={(e) => handleInputChange('utmSource', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="email"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">UTM Medium</Label>
                        <Input
                          value={formData.utmMedium}
                          onChange={(e) => handleInputChange('utmMedium', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder="campaign"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">UTM Campaign</Label>
                        <Input
                          value={formData.utmCampaign}
                          onChange={(e) => handleInputChange('utmCampaign', e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                          placeholder={formData.campaignName.toLowerCase().replace(/\s+/g, '-')}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-white">Review & Send</h3>

                  <div className="grid grid-cols-2 gap-6">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <h4 className="text-white font-semibold mb-3">Campaign Details</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Name:</span>
                            <span className="text-white ml-2">{formData.campaignName}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Type:</span>
                            <span className="text-white ml-2 capitalize">{formData.campaignType}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Subject:</span>
                            <span className="text-white ml-2">{formData.subject}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <h4 className="text-white font-semibold mb-3">Sender Info</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">From:</span>
                            <span className="text-white ml-2">{formData.fromName} &lt;{formData.fromEmail}&gt;</span>
                          </div>
                          {formData.replyTo && (
                            <div>
                              <span className="text-gray-400">Reply-To:</span>
                              <span className="text-white ml-2">{formData.replyTo}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <h4 className="text-white font-semibold mb-3">Audience</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Recipients:</span>
                            <span className="text-white ml-2 font-bold">{targetedCount}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <h4 className="text-white font-semibold mb-3">Schedule</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Send:</span>
                            <span className="text-white ml-2 capitalize">
                              {formData.sendType === 'now' ? 'Immediately' : 
                               formData.sendType === 'scheduled' ? `Scheduled for ${formData.sendDate} ${formData.sendTime}` :
                               `Recurring ${formData.recurringFrequency}`}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3">Email Preview</h4>
                    <div
                      className="w-full min-h-[300px] p-6 bg-white border border-gray-700 rounded-lg"
                      dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
                    />
                  </div>

                  {/* Test Recipients - Moved to Review Step */}
                  <div className="mt-6 pt-6 border-t border-gray-700 space-y-4">
                    <h4 className="text-white font-semibold">Test Recipients</h4>
                    <div>
                      <Label className="text-gray-300">Test Email Addresses</Label>
                      <Input
                        value={testEmails}
                        onChange={(e) => setTestEmails(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                        placeholder="email1@example.com, email2@example.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Separate multiple emails with commas
                      </p>
                    </div>
                    <button
                      onClick={handleSendTest}
                      disabled={!testEmails.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      Send Test Email
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave('draft')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white rounded-lg transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white rounded-lg transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              {!isLastStep ? (
                <button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleSave(formData.sendType === 'now' ? 'sent' : 'scheduled')}
                  disabled={loading || !canProceed()}
                  className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {formData.sendType === 'now' ? 'Send Now' : formData.sendType === 'scheduled' ? 'Schedule' : 'Start Recurring'}
                </button>
              )}
            </div>
          </div>
        </div>
    </motion.div>
  );
}

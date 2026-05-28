"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Eye,
  Send,
  Calendar,
  Target,
  Mail,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Settings,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import CampaignFilters from "./CampaignFilters";
import FilterPresets from "./FilterPresets";
import ABTestingConfig from "./ABTestingConfig";
import { campaignTemplates, CampaignTemplate, BASE_TEMPLATE } from "@/lib/campaign-templates";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Campaign {
  _id?: string;
  campaignName: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  status: "draft" | "scheduled" | "sent" | "cancelled";
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
  sendType?: "now" | "scheduled" | "recurring";
  sendDate?: string;
  sendTime?: string;
  timezone?: string;
  recurringFrequency?: "daily" | "weekly" | "monthly";
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

type Step = "template" | "audience" | "review" | "send";

export default function CampaignEditor({ campaign, onClose, onSave }: Props) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] =
    useState<CampaignTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(!campaign);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [targetedCount, setTargetedCount] = useState(0);
  const [previewingTargets, setPreviewingTargets] = useState(false);
  const [testEmails, setTestEmails] = useState("amlohsl@icloud.com, amlowwh@gmail.com");
  const [previewedEmails, setPreviewedEmails] = useState<string[]>([]);
  const [availableTemplates, setAvailableTemplates] =
    useState<CampaignTemplate[]>(campaignTemplates);
  const [templateCategoryFilter, setTemplateCategoryFilter] =
    useState<string>("all");
  const [isTargetAudienceExpanded, setIsTargetAudienceExpanded] =
    useState(false);
  const [showFilterPresets, setShowFilterPresets] = useState(true);

  // AI Template Generation State
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // A/B Testing State
  const [abTestConfig, setAbTestConfig] = useState<{
    enabled: boolean;
    testType: "subject" | "cta" | "both";
    variants: Array<{
      id: string;
      subjectLine?: string;
      ctaText?: string;
    }>;
    sampleSize: number;
    testDuration: number;
    winningMetric: "opens" | "clicks";
  }>({
    enabled: false,
    testType: "subject",
    variants: [],
    sampleSize: 20,
    testDuration: 4,
    winningMetric: "opens",
  });

  const [formData, setFormData] = useState<Campaign>({
    campaignName: "",
    subject: "",
    htmlContent: "",
    plainTextContent: "",
    status: "draft",
    targetFilters: {},
    tags: [],
    notes: "",
    campaignType: "marketing",
    fromName: "CVCircle Team",
    fromEmail: "support@cvcircle.io",
    replyTo: "support@cvcircle.io",
    previewText: "",
    sendType: "now",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    campaignGoal: "clicks",
    utmSource: "email",
    utmMedium: "campaign",
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        ...campaign,
        targetFilters: campaign.targetFilters || {}
      });
      if (campaign.targetedUserCount) {
        setTargetedCount(campaign.targetedUserCount);
      }
      if (campaign.templateId) {
        const template = campaignTemplates.find(
          (t) => t.id === campaign.templateId,
        );
        if (template) {
          setSelectedTemplate(template);
          setShowTemplateSelector(false);
        }
      }
    }
  }, [campaign]);

  // Auto-update recipient count when filters change
  useEffect(() => {
    const fetchRecipientCount = async () => {
      try {
        const response = await fetch(
          "/api/admin/email-campaigns/preview-targets",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetFilters: formData.targetFilters,
              limit: 0, // Just get count, no preview emails needed
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTargetedCount(data.totalCount || 0);
            console.log('✅ Auto-updated recipient count:', data.totalCount);
          }
        }
      } catch (error) {
        console.error('Failed to auto-fetch recipient count:', error);
        // Don't set to 0 on error - keep previous count
      }
    };

    // Debounce the API call to avoid too many requests
    const timeoutId = setTimeout(() => {
      fetchRecipientCount();
    }, 500); // Wait 500ms after last filter change

    return () => clearTimeout(timeoutId);
  }, [formData.targetFilters]);

  useEffect(() => {
    if (selectedTemplate) {
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      setFormData((prev) => ({
        ...prev,
        // Auto-generate name if creating new or if name is empty
        campaignName: !campaign || !prev.campaignName
          ? `${selectedTemplate.name} - ${dateStr}`
          : prev.campaignName,
        subject: selectedTemplate.subjectTemplate,
        previewText: selectedTemplate.previewText || "",
        htmlContent: selectedTemplate.htmlContent,
        fromName: selectedTemplate.defaultFromName || prev.fromName,
        fromEmail: selectedTemplate.defaultFromEmail || prev.fromEmail,
        replyTo: selectedTemplate.defaultReplyTo || prev.replyTo,
        campaignType: selectedTemplate.category,
        templateId: selectedTemplate.id,
        targetFilters: selectedTemplate.suggestedFilters || prev.targetFilters,
      }));
    }
  }, [selectedTemplate]);

  // Auto-update targeted count when filters change
  // Note: Empty filters {} is valid and means "all users" (excluding unsubscribed)
  useEffect(() => {
    // Debounce the API call
    const timeoutId = setTimeout(() => {
      handlePreviewTargets();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.targetFilters]);

  // Load user data when entering review step
  useEffect(() => {
    if (currentStep === 'review' && previewedEmails.length === 0) {
      handlePreviewTargets();
    }
  }, [currentStep, formData.targetFilters, previewedEmails]);

  const handleInputChange = (field: keyof Campaign, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
  };

  const handleGenerateAiTemplate = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Input Required", description: "Please enter a prompt for the AI.", variant: "destructive" });
      return;
    }

    setIsGeneratingAi(true);
    try {
      const response = await fetch("/api/admin/ai-email-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          category: templateCategoryFilter !== "all" ? templateCategoryFilter : "general"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate template");
      }

      const data = await response.json();
      
      if (data.success && data.htmlContent) {
        const generatedHtml = BASE_TEMPLATE(data.htmlContent, data.subject || "AI Generated Campaign");
        
        const newTemplate: CampaignTemplate = {
          id: `ai-${Date.now()}`,
          name: "✨ AI Generated Template",
          description: aiPrompt.slice(0, 50) + "...",
          category: templateCategoryFilter !== "all" ? (templateCategoryFilter as any) : "newsletter",
          scenario: "AI Generated",
          subjectTemplate: data.subject || "Exciting news from CVCircle",
          htmlContent: generatedHtml,
          defaultFromName: "CVCircle Team",
          defaultFromEmail: "support@cvcircle.io"
        };
        
        setAvailableTemplates(prev => [newTemplate, ...prev]);
        setSelectedTemplate(newTemplate);
        setShowAiPrompt(false);
        setAiPrompt("");
        
        toast({ title: "Template Generated", description: "Your AI template is ready to use!", variant: "success" });
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error: any) {
      toast({ title: "Generation Failed", description: error.message || "Failed to generate AI template", variant: "destructive" });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handlePreviewTargets = async () => {
    setPreviewingTargets(true);
    try {
      const response = await fetch(
        "/api/admin/email-campaigns/preview-targets",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetFilters: formData.targetFilters,
            limit: 10,
          }),
        },
      );

      // Check if response is ok and has content
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Preview targets API error:", response.status, errorText);
        toast({
          title: "Preview Failed",
          description: `Failed to preview targets: ${response.status} ${response.statusText}`,
          variant: "destructive"
        });
        setPreviewingTargets(false);
        return;
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        console.error("Non-JSON response from preview-targets:", errorText);
        toast({
          title: "Error",
          description: "Invalid response from server. Please try again.",
          variant: "destructive"
        });
        setPreviewingTargets(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setTargetedCount(data.totalCount || 0);
        if (data.users && data.users.length > 0) {
          console.log("Preview users:", data.users);
          // Extract emails from users and save to state
          const emails = data.users.map((user: any) => user.email).filter(Boolean);
          setPreviewedEmails(emails);
        }
      } else {
        toast({
          title: "Preview Failed",
          description: `Failed to preview targets: ${data.error || "Unknown error"}`,
          variant: "destructive"
        });
        setTargetedCount(0);
      }
    } catch (error: any) {
      console.error("Failed to preview targets:", error);
      toast({
        title: "Error",
        description: `Error: ${error.message || "Failed to preview targets. Please try again."}`,
        variant: "destructive"
      });
      setTargetedCount(0);
    } finally {
      setPreviewingTargets(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmails.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one email address",
        variant: "destructive"
      });
      return;
    }

    const emailList = testEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    setLoading(true); // Reuse loading or add specific state
    try {
      const response = await fetch("/api/admin/email-campaigns/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emailList,
          subject: formData.subject,
          htmlContent: formData.htmlContent,
          fromName: formData.fromName,
          fromEmail: formData.fromEmail
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.results.failed > 0) {
          toast({
            title: "Test Email Status",
            description: `Sent: ${data.results.sent}, Failed: ${data.results.failed}. Error: ${data.results.errors[0] || 'Unknown error'}`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Test Emails Sent",
            description: `Successfully sent to ${data.results.sent} recipients.`,
            variant: "success"
          });
        }
      } else {
        toast({
          title: "Send Failed",
          description: data.error || "Failed to send test emails",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilterPreset = (filters: any, presetName: string) => {
    setFormData((prev) => ({
      ...prev,
      targetFilters: filters,
      filterPresetName: presetName,
    }));
    setShowFilterPresets(false);
    // Immediately load preview data for the selected preset
    setTimeout(() => handlePreviewTargets(), 100);
  };

  const handleSaveCustomPreset = (name: string, filters: any) => {
    // TODO: Implement saving custom preset to backend
    console.log("Saving custom preset:", name, filters);
    toast({
      title: "Preset Saved",
      description: `Custom preset "${name}" saved successfully!`,
      variant: "success"
    });
  };

  const handleSave = async (status: "draft" | "scheduled" | "sent" | "recurring") => {
    // Validation
    if (!formData.campaignName || formData.campaignName.length < 5) {
      toast({ title: "Validation Error", description: "Campaign name must be at least 5 characters", variant: "destructive" });
      return;
    }
    if (!formData.subject) {
      toast({ title: "Validation Error", description: "Subject line is required", variant: "destructive" });
      return;
    }
    if (!formData.htmlContent) {
      toast({ title: "Validation Error", description: "Email content is required", variant: "destructive" });
      return;
    }
    if (!formData.fromName || !formData.fromEmail) {
      toast({ title: "Validation Error", description: "Sender information is required", variant: "destructive" });
      return;
    }
    // Empty filters {} is valid (means "all users"), so no validation needed

    setLoading(true);
    try {
      const url = campaign?._id
        ? `/api/admin/email-campaigns/${campaign._id}`
        : "/api/admin/email-campaigns";

      const method = campaign?._id ? "PUT" : "POST";

      // Determine scheduled date/time if needed
      let scheduledAt = undefined;
      if (
        formData.sendType === "scheduled" &&
        formData.sendDate &&
        formData.sendTime
      ) {
        const [hours, minutes] = formData.sendTime.split(":");
        const date = new Date(formData.sendDate);
        date.setHours(parseInt(hours), parseInt(minutes));
        scheduledAt = date.toISOString();
      }

      // 1. Save/Update Campaign First
      const saveResponse = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          targetFilters: formData.targetFilters || {},
          status: status === "sent" ? "draft" : status, // Save as draft first if sending now, to prevent premature 'sent' status before actual send
          scheduledAt,
          targetedUserCount: targetedCount,
          abTestConfig: abTestConfig.enabled ? abTestConfig : undefined,
        }),
      });

      const contentType = saveResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format from server");
      }

      const saveData = await saveResponse.json();

      if (!saveData.success) {
        throw new Error(saveData.error || "Failed to save campaign");
      }

      const campaignId = saveData.campaign._id;

      // 2. If "Send Now" (status === 'sent'), trigger the send endpoint
      if (status === "sent") {
        const sendResponse = await fetch(`/api/admin/email-campaigns/${campaignId}/send`, {
          method: "POST",
        });

        const sendData = await sendResponse.json();

        if (!sendData.success) {
          // If send fails, the user will be alerted but campaign remains saved as draft (from step 1) or whatever state it was
          throw new Error(sendData.error || "Campaign saved but failed to send");
        }

        toast({
          title: "Campaign Sent",
          description: `Campaign sent successfully! Sent: ${sendData.sentValues?.sent}, Failed: ${sendData.sentValues?.failed}`,
          variant: "success"
        });
      } else {
        toast({
          title: "Campaign Saved",
          description: "Campaign saved successfully!",
          variant: "success"
        });
      }

      onSave();
    } catch (error: any) {
      console.error("Failed to save/send campaign:", error);
      toast({
        title: "Error",
        description: `Error: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    {
      id: "template",
      label: "1. Select Template",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "audience",
      label: "2. Select Target Users",
      icon: <Users className="w-4 h-4" />,
    },
    { id: "review", label: "3. Review", icon: <Eye className="w-4 h-4" /> },
    { id: "send", label: "4. Send", icon: <Send className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const canProceed = () => {
    switch (currentStep) {
      case "template":
        return selectedTemplate !== null && formData.campaignName.length >= 5;
      case "audience":
        // Empty filters {} is valid (means "all users")
        // Always allow proceeding from audience step
        return true;
      case "review":
        return true;
      case "send":
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (!canProceed()) {
      toast({
        title: "Incomplete Step",
        description: "Please complete all required fields before proceeding",
        variant: "destructive"
      });
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

  const filteredTemplates =
    templateCategoryFilter === "all"
      ? availableTemplates
      : availableTemplates.filter((t) => t.category === templateCategoryFilter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-full flex flex-col bg-gray-900 border-l border-gray-700 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {campaign ? "Edit Campaign" : "Create Email Campaign"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {campaign
                ? "Update your email campaign"
                : "Create engaging email campaigns for your users"}
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
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${currentStepIndex >= index
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-600 text-gray-400"
                      }`}
                  >
                    {currentStepIndex > index ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm ${currentStep === step.id
                      ? "text-white font-medium"
                      : "text-gray-400"
                      }`}
                  >
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
            {currentStep === "template" && (
              <motion.div
                key="template"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4">
                  Select an Email Template
                </h3>

                {/* Template Selection */}
                <div className="mb-6">
                  <div className="mb-4 flex items-center justify-between">
                    <Select
                      value={templateCategoryFilter}
                      onValueChange={setTemplateCategoryFilter}
                    >
                      <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white">
                        <SelectItem
                          value="all"
                          className="text-white focus:bg-gray-800"
                        >
                          All Categories
                        </SelectItem>
                        <SelectItem
                          value="onboarding"
                          className="text-white focus:bg-gray-800"
                        >
                          Onboarding
                        </SelectItem>
                        <SelectItem
                          value="upsell"
                          className="text-white focus:bg-gray-800"
                        >
                          Upsell & Monetization
                        </SelectItem>
                        <SelectItem
                          value="engagement"
                          className="text-white focus:bg-gray-800"
                        >
                          Engagement
                        </SelectItem>
                        <SelectItem
                          value="transactional"
                          className="text-white focus:bg-gray-800"
                        >
                          Transactional
                        </SelectItem>
                        <SelectItem
                          value="trigger"
                          className="text-white focus:bg-gray-800"
                        >
                          Trigger / Automated
                        </SelectItem>
                        <SelectItem
                          value="newsletter"
                          className="text-white focus:bg-gray-800"
                        >
                          Newsletter (Manual)
                        </SelectItem>
                        <SelectItem
                          value="retention"
                          className="text-white focus:bg-gray-800"
                        >
                          Retention / Win-back
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <button
                      onClick={() => setShowAiPrompt(!showAiPrompt)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${showAiPrompt ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:border-gray-600'}`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Create with AI
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {showAiPrompt && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 overflow-hidden"
                      >
                        <div className="p-4 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-800/50 rounded-lg space-y-3">
                          <Label className="text-blue-200 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-400" />
                            Describe the email you want to send
                          </Label>
                          <Textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="E.g., An upsell email for our Day Pass targeting users who have created 3 free resumes but haven't upgraded yet. Offer them a 20% discount code: PRO20."
                            className="bg-gray-900/80 border-blue-800/50 text-white min-h-[100px] resize-none"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={handleGenerateAiTemplate}
                              disabled={isGeneratingAi || !aiPrompt.trim()}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
                            >
                              {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              {isGeneratingAi ? 'Generating Template...' : 'Generate Template'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {filteredTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all ${selectedTemplate?.id === template.id
                          ? "bg-blue-500/20 border-blue-500 ring-2 ring-blue-500"
                          : "bg-gray-800 border-gray-700 hover:border-blue-500"
                          }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-white font-semibold">
                                {template.name}
                              </h4>
                              <p className="text-gray-400 text-sm mt-1">
                                {template.description}
                              </p>
                            </div>
                            <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                              {template.category}
                            </span>
                          </div>
                          <div className="mt-3 text-xs text-gray-500">
                            Scenario: {template.scenario.replace("_", " ")}
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <div className="mt-2 flex items-center text-blue-400 text-sm">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Selected
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Campaign Name - shown after template selection */}
                {selectedTemplate && (
                  <div className="mt-6">
                    <Label className="text-gray-300">Campaign Name *</Label>
                    <Input
                      value={formData.campaignName}
                      onChange={(e) =>
                        handleInputChange("campaignName", e.target.value)
                      }
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="e.g., Welcome New Users - December 2024"
                      minLength={5}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.campaignName.length}/5 min characters
                    </p>
                  </div>
                )}

                {selectedTemplate && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-300">
                      <strong>Template Selected:</strong>{" "}
                      {selectedTemplate.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click "Next" to configure your target audience
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === "audience" && (
              <motion.div
                key="audience"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4">
                  Select Target Users
                </h3>

                {/* Estimated Recipients - MOVED TO TOP */}
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-300 mb-1">
                        Estimated Recipients
                      </div>
                      <div className="text-4xl font-bold text-white">
                        {targetedCount.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {targetedCount === 0
                          ? "Select filters to target users"
                          : "users will receive this campaign"}
                      </p>
                    </div>
                    <button
                      onClick={handlePreviewTargets}
                      disabled={previewingTargets || targetedCount === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-4 h-4" />
                      {previewingTargets ? "Loading..." : "Preview Users"}
                    </button>
                  </div>

                  {/* Preview Users List */}
                  {previewedEmails.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-500/20">
                      <h5 className="text-sm font-semibold text-white mb-2">
                        Sample Recipients:
                      </h5>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {previewedEmails.map((email: string, idx: number) => (
                          <div
                            key={idx}
                            className="text-sm text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded"
                          >
                            {email}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Showing {previewedEmails.length} of {targetedCount} recipients
                      </p>
                    </div>
                  )}
                </div>

                {/* Filter Presets */}
                <div className="mb-6">
                  <FilterPresets
                    onApplyPreset={handleApplyFilterPreset}
                    currentFilters={formData.targetFilters}
                    onSaveCustomPreset={handleSaveCustomPreset}
                  />
                </div>

                {/* Target Audience Filters */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-4">
                    Refine Audience (Optional)
                  </h4>
                  <CampaignFilters
                    filters={formData.targetFilters}
                    onChange={(filters) =>
                      handleInputChange("targetFilters", filters)
                    }
                    twoColumn={true}
                  />
                </div>

                {targetedCount > 0 && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-300">
                      ✓ Audience selected! Click "Next" to review your campaign
                      before sending.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4">
                  Review Campaign
                </h3>

                {/* Email Template Preview */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Email Template Preview
                  </h4>
                  <div className="bg-white border border-gray-700 rounded-lg p-6 max-h-96 overflow-y-auto">
                    <div
                      dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
                    />
                  </div>
                </div>

                {/* Ready to Send - Filtered Users */}
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-green-300 mb-1">
                        Ready to Send
                      </h4>
                      <div className="text-4xl font-bold text-white">
                        {targetedCount.toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-300 mt-1">
                        filtered users selected
                      </p>
                    </div>
                    <div className="text-green-400">
                      <CheckCircle className="w-16 h-16" />
                    </div>
                  </div>

                  {/* List of Filtered User Emails */}
                  {previewedEmails.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-green-500/20">
                      <h5 className="text-sm font-semibold text-white mb-2">
                        Sample Recipients:
                      </h5>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {previewedEmails.map((email: string, idx: number) => (
                          <div
                            key={idx}
                            className="text-sm text-gray-300 bg-gray-800/50 px-3 py-1.5 rounded"
                          >
                            {email}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Showing {previewedEmails.length} of {targetedCount} recipients
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-300">
                    Review your campaign above. Click "Next" to choose when to send.
                  </p>
                </div>
              </motion.div>
            )}

            {currentStep === "send" && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Test Send Section */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Send Test Email
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        value={testEmails}
                        onChange={(e) => setTestEmails(e.target.value)}
                        placeholder="Enter email addresses (comma separated)"
                        className="bg-gray-900 border-gray-600 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-2">
                        Separate multiple emails with commas.
                      </p>
                    </div>
                    <button
                      onClick={handleSendTest}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 rounded-lg whitespace-nowrap h-10"
                    >
                      Send Test
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white">
                  Scheduling Options
                </h3>

                <div>
                  <Label className="text-gray-300">Send Type *</Label>
                  <div className="mt-2 space-y-2">
                    {["now", "scheduled", "recurring"].map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="radio"
                          name="sendType"
                          value={type}
                          checked={formData.sendType === type}
                          onChange={(e) =>
                            handleInputChange("sendType", e.target.value)
                          }
                          className="w-4 h-4 text-emerald-700"
                        />
                        <span className="text-slate-900 capitalize">
                          {type === "now"
                            ? "Send Now"
                            : type === "scheduled"
                              ? "Schedule for Later"
                              : "Recurring Campaign"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.sendType === "scheduled" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Send Date *</Label>
                      <Input
                        type="date"
                        value={formData.sendDate}
                        onChange={(e) =>
                          handleInputChange("sendDate", e.target.value)
                        }
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Send Time *</Label>
                      <Input
                        type="time"
                        value={formData.sendTime}
                        onChange={(e) =>
                          handleInputChange("sendTime", e.target.value)
                        }
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Timezone</Label>
                      <Input
                        value={formData.timezone}
                        onChange={(e) =>
                          handleInputChange("timezone", e.target.value)
                        }
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                  </div>
                )}

                {formData.sendType === "recurring" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Frequency *</Label>
                      <Select
                        value={formData.recurringFrequency}
                        onValueChange={(value) =>
                          handleInputChange("recurringFrequency", value)
                        }
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white">
                          <SelectItem
                            value="daily"
                            className="text-white focus:bg-gray-800"
                          >
                            Daily
                          </SelectItem>
                          <SelectItem
                            value="weekly"
                            className="text-white focus:bg-gray-800"
                          >
                            Weekly
                          </SelectItem>
                          <SelectItem
                            value="monthly"
                            className="text-white focus:bg-gray-800"
                          >
                            Monthly
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Start Date *</Label>
                      <Input
                        type="date"
                        value={formData.sendDate}
                        onChange={(e) =>
                          handleInputChange("sendDate", e.target.value)
                        }
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">
                        End Date (Optional)
                      </Label>
                      <Input
                        type="date"
                        value={formData.recurringEndDate}
                        onChange={(e) =>
                          handleInputChange("recurringEndDate", e.target.value)
                        }
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                        min={formData.sendDate}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-semibold text-white">
                    Goals and Tracking
                  </h3>

                  <div>
                    <Label className="text-gray-300">Campaign Goal</Label>
                    <Select
                      value={formData.campaignGoal}
                      onValueChange={(value) =>
                        handleInputChange("campaignGoal", value)
                      }
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white">
                        <SelectItem
                          value="clicks"
                          className="text-white focus:bg-gray-800"
                        >
                          Clicks
                        </SelectItem>
                        <SelectItem
                          value="conversions"
                          className="text-white focus:bg-gray-800"
                        >
                          Conversions
                        </SelectItem>
                        <SelectItem
                          value="opens"
                          className="text-white focus:bg-gray-800"
                        >
                          Opens
                        </SelectItem>
                        <SelectItem
                          value="signups"
                          className="text-white focus:bg-gray-800"
                        >
                          Signups
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-300">UTM Source</Label>
                      <Input
                        value={formData.utmSource}
                        onChange={(e) =>
                          handleInputChange("utmSource", e.target.value)
                        }
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                        placeholder="email"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">UTM Medium</Label>
                      <Input
                        value={formData.utmMedium}
                        onChange={(e) =>
                          handleInputChange("utmMedium", e.target.value)
                        }
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                        placeholder="campaign"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">UTM Campaign</Label>
                      <Input
                        value={formData.utmCampaign}
                        onChange={(e) =>
                          handleInputChange("utmCampaign", e.target.value)
                        }
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                        placeholder={formData.campaignName
                          .toLowerCase()
                          .replace(/\s+/g, "-")}
                      />
                    </div>
                  </div>
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
              onClick={() => handleSave("draft")}
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
                onClick={() =>
                  handleSave(
                    formData.sendType === "now"
                      ? "sent"
                      : formData.sendType === "recurring"
                        ? "recurring"
                        : "scheduled"
                  )
                }
                disabled={loading || !canProceed()}
                className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {formData.sendType === "now"
                  ? "Send Now"
                  : formData.sendType === "scheduled"
                    ? "Schedule"
                    : "Start Recurring"}
              </button>
            )}
          </div>
        </div>
      </motion.div >
    </motion.div >
  );
}

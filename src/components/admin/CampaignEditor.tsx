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
  Database,
  Edit,
  Filter,
  Shield,
  Clock,
  Zap,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  csvRecipients?: Array<{ name: string; email: string }>;
}

interface Props {
  campaign: Campaign | null;
  onClose: () => void;
  onSave: () => void;
}

type Step = "design" | "dispatch";

export default function CampaignEditor({ campaign, onClose, onSave }: Props) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("design");
  const [selectedTemplate, setSelectedTemplate] =
    useState<CampaignTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(!campaign);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [targetedCount, setTargetedCount] = useState(0);
  const [previewingTargets, setPreviewingTargets] = useState(false);
  const [testEmails, setTestEmails] = useState("amlohsl@icloud.com");
  const [previewedEmails, setPreviewedEmails] = useState<string[]>([]);
  const [availableTemplates, setAvailableTemplates] =
    useState<CampaignTemplate[]>(campaignTemplates);
  const [templateCategoryFilter, setTemplateCategoryFilter] =
    useState<string>("all");
  const [activeDesignTab, setActiveDesignTab] = useState<"template" | "editor" | "preview">("template");
  const [processingFile, setProcessingFile] = useState(false);

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
    csvRecipients: [],
  });

  const steps: { id: Step; label: string; icon: any }[] = [
    { id: "design", label: "Email Content", icon: FileText },
    { id: "dispatch", label: "Recipients & Send", icon: Send },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const nextStep = () => {
    if (!canProceed()) {
      toast({
        title: "Incomplete Step",
        description: "Please complete all required fields before proceeding",
        variant: "destructive"
      });
      return;
    }
    if (!isLastStep) setCurrentStep(steps[currentStepIndex + 1].id);
  };

  const prevStep = () => {
    if (!isFirstStep) setCurrentStep(steps[currentStepIndex - 1].id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingFile(true);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
        const recipients: Array<{ name: string; email: string }> = [];

        if (extension === 'xlsx' || extension === 'xls') {
            const XLSX = await import('xlsx');
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                    jsonData.forEach((row, index) => {
                        if (index === 0) return; // Skip header
                        
                        let name = "Valued User";
                        let email = "";

                        // Smart detection: find email and name in columns
                        row.forEach(cell => {
                            const val = String(cell || '').trim();
                            if (val.includes('@') && val.includes('.')) {
                                email = val;
                            } else if (val && name === "Valued User" && isNaN(Number(val))) {
                                name = val;
                            }
                        });

                        if (email) {
                            recipients.push({ name, email });
                        }
                    });

                    if (recipients.length > 0) {
                        setFormData(prev => ({ ...prev, csvRecipients: recipients }));
                        toast({ title: "Data Ingested", description: `Successfully merged ${recipients.length} identities from Excel.`, variant: "success" });
                        handlePreviewTargets();
                    } else {
                        toast({ title: "No Data Found", description: "Could not find valid email addresses in the file.", variant: "destructive" });
                    }
                } catch (err) {
                    toast({ title: "Parsing Error", description: "Failed to read Excel structure.", variant: "destructive" });
                } finally {
                    setProcessingFile(false);
                }
            };
            reader.readAsArrayBuffer(file);
            return;
        }

        // CSV Parsing
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) return;

                const lines = text.split(/\r?\n/);
                
                lines.forEach((line, index) => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return;
                    if (index === 0 && trimmedLine.toLowerCase().includes("email")) return;

                    const parts = trimmedLine.split(",").map(s => s.trim().replace(/^"|"$/g, ""));
                    let name = "Valued User";
                    let email = "";

                    parts.forEach(part => {
                        if (part.includes('@') && part.includes('.')) email = part;
                        else if (part && name === "Valued User" && isNaN(Number(part))) name = part;
                    });

                    if (email) recipients.push({ name, email });
                });

                if (recipients.length > 0) {
                    setFormData(prev => ({ ...prev, csvRecipients: recipients }));
                    toast({ title: "CSV Ingested", description: `Captured ${recipients.length} identity nodes.`, variant: "success" });
                    handlePreviewTargets();
                } else {
                    toast({ title: "Upload Failed", description: "No valid email stream detected.", variant: "destructive" });
                }
            } finally {
                setProcessingFile(false);
            }
        };
        reader.readAsText(file);

    } catch (error) {
        console.error("File processing error:", error);
        toast({ title: "System Error", description: "Failed to initialize ingestion protocol.", variant: "destructive" });
        setProcessingFile(false);
    }
  };

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
          setActiveDesignTab("editor");
        }
      }
    }
  }, [campaign]);

  useEffect(() => {
    if (selectedTemplate) {
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      setFormData((prev) => ({
        ...prev,
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

  const handleInputChange = (field: keyof Campaign, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setActiveDesignTab("editor");
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

      if (!response.ok) throw new Error("Failed to generate template");

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
        setActiveDesignTab("editor");
        
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
            csvRecipients: formData.csvRecipients,
            limit: 10,
          }),
        },
      );

      if (!response.ok) {
        setPreviewingTargets(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setTargetedCount(data.totalCount || 0);
        if (data.users && data.users.length > 0) {
          const emails = data.users.map((user: any) => user.email).filter(Boolean);
          setPreviewedEmails(emails);
        }
      }
    } catch (error: any) {
      console.error("Failed to preview targets:", error);
    } finally {
      setPreviewingTargets(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmails.trim()) {
      toast({ title: "Validation Error", description: "Please enter an email address", variant: "destructive" });
      return;
    }

    const emailList = testEmails.split(",").map((e) => e.trim()).filter(Boolean);
    setLoading(true);
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
        toast({ title: "Test Sent", variant: "success" });
      } else {
        toast({ title: "Send Failed", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilterPreset = (filters: any, presetName: string) => {
    setFormData((prev) => ({
      ...prev,
      targetFilters: filters,
    }));
    setTimeout(() => handlePreviewTargets(), 100);
  };

  const handleSave = async (status: "draft" | "scheduled" | "sent" | "recurring") => {
    if (!formData.campaignName || formData.campaignName.length < 5) {
      toast({ title: "Validation Error", description: "Name too short", variant: "destructive" });
      return;
    }
    if (!formData.subject || !formData.htmlContent) {
      toast({ title: "Validation Error", description: "Subject and content required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const url = campaign?._id ? `/api/admin/email-campaigns/${campaign._id}` : "/api/admin/email-campaigns";
      const method = campaign?._id ? "PUT" : "POST";

      let scheduledAt = undefined;
      if (formData.sendType === "scheduled" && formData.sendDate && formData.sendTime) {
        const [hours, minutes] = formData.sendTime.split(":");
        const date = new Date(formData.sendDate);
        date.setHours(parseInt(hours), parseInt(minutes));
        scheduledAt = date.toISOString();
      }

      const saveResponse = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          targetFilters: formData.targetFilters || {},
          status: status === "sent" ? "draft" : status,
          scheduledAt,
          targetedUserCount: targetedCount,
          abTestConfig: abTestConfig.enabled ? abTestConfig : undefined,
        }),
      });

      const saveData = await saveResponse.json();
      if (!saveData.success) throw new Error(saveData.error || "Failed to save");

      if (status === "sent") {
        const sendResponse = await fetch(`/api/admin/email-campaigns/${saveData.campaign._id}/send`, { method: "POST" });
        const sendData = await sendResponse.json();
        if (!sendData.success) throw new Error(sendData.error || "Failed to send");
        toast({ title: "Campaign Dispatched", variant: "success" });
      } else {
        toast({ title: "Campaign Saved", variant: "success" });
      }
      onSave();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (currentStep === "design") {
      return selectedTemplate !== null && formData.campaignName.length >= 5 && formData.subject.length > 0;
    }
    return true;
  };

  const filteredTemplates =
    templateCategoryFilter === "all"
      ? availableTemplates
      : availableTemplates.filter((t) => t.category === templateCategoryFilter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-full flex flex-col bg-[#050505] border-l border-white/5 shadow-2xl overflow-hidden relative"
      >
        {/* Loading Overlay */}
        <AnimatePresence>
            {processingFile && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full mb-4" />
                    <p className="text-white font-black uppercase tracking-widest text-[10px]">Processing Data Protocol...</p>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Header */}
        <div className="h-24 flex items-center justify-between px-8 border-b border-white/5 bg-white/2 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Mail className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
                {campaign ? "Edit" : "New"} <span className="text-emerald-500">Email</span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  {formData.campaignType}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Tracker (2 Steps) */}
        <div className="px-8 py-6 bg-white/[0.01] border-b border-white/5">
          <div className="flex items-center justify-center gap-12 max-w-lg mx-auto">
            {steps.map((step, idx) => {
              const isActive = step.id === currentStep;
              const isCompleted = currentStepIndex > idx;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-3 relative">
                    <button
                      onClick={() => isCompleted && setCurrentStep(step.id)}
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-500 ${
                        isActive 
                          ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.4)]' 
                          : isCompleted 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-white/5 border-white/5 text-white/20'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                    </button>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-emerald-400' : 'text-white/20'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-24 h-[2px] bg-white/5 relative overflow-hidden">
                      <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isCompleted ? 1 : 0 }}
                        className="absolute inset-0 bg-emerald-500 origin-left"
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {currentStep === "design" && (
                <motion.div key="design" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <div className="flex justify-center mb-8">
                    <Tabs value={activeDesignTab} onValueChange={(v: any) => setActiveDesignTab(v)} className="bg-white/5 p-1 rounded-2xl border border-white/5">
                        <TabsList className="bg-transparent border-0">
                            <TabsTrigger value="template" className="rounded-xl px-8 data-[state=active]:bg-emerald-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest transition-all">1. Choose Template</TabsTrigger>
                            <TabsTrigger value="editor" className="rounded-xl px-8 data-[state=active]:bg-emerald-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest transition-all">2. Edit Content</TabsTrigger>
                            <TabsTrigger value="preview" className="rounded-xl px-8 data-[state=active]:bg-emerald-500 data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest transition-all">3. Visual Preview</TabsTrigger>
                        </TabsList>
                    </Tabs>
                  </div>

                  {activeDesignTab === "template" && (
                    <section className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Blueprints</h3>
                                <p className="text-white/30 text-xs font-bold mt-1">Select a starting protocol</p>
                            </div>
                            <button onClick={() => setShowAiPrompt(!showAiPrompt)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${showAiPrompt ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:text-white'}`}>
                                <Sparkles className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Build with AI</span>
                            </button>
                        </div>
                        {showAiPrompt && (
                             <div className="p-6 bg-purple-500/5 border border-purple-500/20 rounded-[2rem] space-y-4">
                                <Label className="text-purple-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Define Mission</Label>
                                <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Describe the campaign mission..." className="bg-black/40 border-purple-500/20 text-white rounded-2xl min-h-[100px]" />
                                <button onClick={handleGenerateAiTemplate} disabled={isGeneratingAi} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px]">
                                    {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Sparkles className="w-4 h-4 inline mr-2" />} Synthesize
                                </button>
                             </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredTemplates.map((template) => (
                                <div key={template.id} onClick={() => handleTemplateSelect(template)} className={`p-5 rounded-[2rem] border transition-all cursor-pointer ${selectedTemplate?.id === template.id ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}>
                                    <h4 className="text-sm font-black text-white uppercase">{template.name}</h4>
                                    <p className="text-[10px] text-white/30 font-bold mt-1">{template.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                  )}

                  {activeDesignTab === "editor" && (
                    <section className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Internal Name</Label>
                                <Input value={formData.campaignName} onChange={(e) => handleInputChange("campaignName", e.target.value)} className="bg-white/5 border-white/5 rounded-2xl py-6" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Subject Line</Label>
                                <Input value={formData.subject} onChange={(e) => handleInputChange("subject", e.target.value)} className="bg-white/5 border-white/5 rounded-2xl py-6" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest">From Name</Label>
                                <Input value={formData.fromName} onChange={(e) => handleInputChange("fromName", e.target.value)} className="bg-white/5 border-white/5 rounded-2xl py-6" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest">From Email</Label>
                                <Input value={formData.fromEmail} onChange={(e) => handleInputChange("fromEmail", e.target.value)} className="bg-white/5 border-white/5 rounded-2xl py-6" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest">HTML Payload</Label>
                            <Textarea value={formData.htmlContent} onChange={(e) => handleInputChange("htmlContent", e.target.value)} className="bg-white/5 border-white/5 rounded-2xl min-h-[400px] font-mono text-xs" />
                        </div>
                    </section>
                  )}

                  {activeDesignTab === "preview" && (
                    <section className="bg-white rounded-[2.5rem] p-10 shadow-2xl min-h-[500px] border border-white/10">
                        <div dangerouslySetInnerHTML={{ 
                          __html: formData.htmlContent.replace(/{{appUrl}}/g, window.location.origin) 
                        }} />
                    </section>
                  )}
                </motion.div>
              )}

              {currentStep === "dispatch" && (
                <motion.div key="dispatch" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
                  {/* Email Preview Mini-Card - ADDED AS REQUESTED */}
                  <div className="bg-[#111111] border border-white/10 rounded-[2rem] p-6 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-xl text-white/40"><Mail className="w-5 h-5" /></div>
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Current Payload</p>
                            <p className="text-sm font-bold text-white">{formData.subject || "No Subject"}</p>
                        </div>
                    </div>
                    <button onClick={() => { setCurrentStep("design"); setActiveDesignTab("preview"); }} className="text-[10px] font-black uppercase text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-xl hover:bg-emerald-500/10 transition-all">Review Design</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-6">
                        <h4 className="text-lg font-black text-white uppercase">Sector Filtering</h4>
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6">
                            <FilterPresets onApplyPreset={handleApplyFilterPreset} currentFilters={formData.targetFilters} />
                            <div className="mt-6"><CampaignFilters filters={formData.targetFilters} onChange={(f) => handleInputChange("targetFilters", f)} /></div>
                        </div>
                    </section>
                    
                    <section className="space-y-6">
                        <h4 className="text-lg font-black text-white uppercase">Bulk Ingestion</h4>
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 border-dashed flex flex-col items-center text-center">
                            <Database className="w-8 h-8 text-emerald-500 mb-4" />
                            <p className="text-[10px] text-white/30 font-bold mb-6">Upload CSV or XLSX protocols</p>
                            <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="bg-white/5 border-white/5 h-12 file:bg-white/10 file:text-white file:rounded-lg file:px-4" />
                            {formData.csvRecipients && formData.csvRecipients.length > 0 && (
                                <div className="mt-4 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase">{formData.csvRecipients.length} Identities Merged</div>
                            )}
                        </div>

                        <div className="bg-emerald-600 rounded-[2rem] p-8 text-black">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Target Base</p>
                            <h2 className="text-5xl font-black tracking-tighter">{targetedCount.toLocaleString()}</h2>
                        </div>
                    </section>
                  </div>

                  <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10">
                    <h3 className="text-lg font-black text-white uppercase mb-8 flex items-center gap-3"><Clock className="w-5 h-5 text-emerald-500" /> Temporal Dispatch</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {['now', 'scheduled', 'recurring'].map(type => (
                        <div key={type} onClick={() => handleInputChange("sendType", type)} className={`p-6 rounded-[2rem] border transition-all cursor-pointer ${formData.sendType === type ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-white/[0.02] border-white/5 text-white hover:border-white/20'}`}>
                          <h4 className="text-sm font-black uppercase">{type}</h4>
                        </div>
                      ))}
                    </div>
                    {formData.sendType === "scheduled" && (
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <Input type="date" value={formData.sendDate} onChange={(e) => handleInputChange("sendDate", e.target.value)} className="bg-black/40 border-white/5 rounded-2xl py-6" />
                            <Input type="time" value={formData.sendTime} onChange={(e) => handleInputChange("sendTime", e.target.value)} className="bg-black/40 border-white/5 rounded-2xl py-6" />
                        </div>
                    )}
                  </section>

                  <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10">
                    <h3 className="text-lg font-black text-white uppercase mb-8 flex items-center gap-3"><Mail className="w-5 h-5 text-emerald-500" /> Test Dispatch</h3>
                    <div className="flex gap-4">
                        <Input value={testEmails} onChange={(e) => setTestEmails(e.target.value)} className="bg-black/40 border-white/5 rounded-2xl py-6" />
                        <button onClick={handleSendTest} className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase border border-white/5">Deploy Test</button>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Command Footer */}
        <div className="h-24 px-8 border-t border-white/5 bg-white/2 backdrop-blur-md flex items-center justify-between z-20">
          <Button variant="ghost" onClick={prevStep} disabled={currentStepIndex === 0} className="text-white/40 hover:text-white font-black text-xs uppercase tracking-widest"><ChevronLeft className="w-5 h-5 mr-2" /> Reverse</Button>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Step {currentStepIndex + 1} of {steps.length}</span>
            <div className="flex gap-1.5">{steps.map((s, i) => (<div key={i} className={`w-12 h-1 rounded-full ${i <= currentStepIndex ? 'bg-emerald-500' : 'bg-white/10'}`} />))}</div>
          </div>
          {currentStepIndex < steps.length - 1 ? (
            <Button onClick={nextStep} className="bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-2xl px-12 py-6">Next Step <ChevronRight className="w-5 h-5 ml-2" /></Button>
          ) : (
            <Button onClick={() => handleSave(formData.sendType === "now" ? "sent" : formData.sendType === "recurring" ? "recurring" : "scheduled")} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-2xl px-12 py-6">{loading ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5 mr-2" />} Dispatch Matrix</Button>
          )}
        </div>
      </motion.div >
    </motion.div >
  );
}

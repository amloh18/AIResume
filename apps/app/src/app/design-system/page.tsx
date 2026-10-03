'use client';

import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Toggle,
  Switch,
  Badge,
  Pill,
  Input,
  SearchInput,
  Dropdown,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  PageHeader,
  SectionHeader,
  TableActionGroup,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui';
import {
  Sparkles,
  Plus,
  Zap,
  Shield,
  Eye,
  Edit2,
  Trash2,
  Bookmark,
  Briefcase,
  SlidersHorizontal,
  Settings,
} from 'lucide-react';

export default function DesignSystemTestbench() {
  const [toggleState, setToggleState] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [activePill, setActivePill] = useState(true);
  const [selectedDropdown, setSelectedDropdown] = useState('remote');
  const [searchValue, setSearchValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('buttons');

  const handleToggleClick = () => {
    setToggleLoading(true);
    setTimeout(() => {
      setToggleState((prev) => !prev);
      setToggleLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-50/60 dark:bg-[#0e110c] p-6 sm:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <PageHeader
          eyebrow="Design System"
          title="BuildAIResume UI Primitives"
          description="Authoritative reference and interactive testbench for global design tokens, controls, and primitives."
          badge={<Badge variant="beta">BETA</Badge>}
          actions={
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Open Modal Preview
            </Button>
          }
        />

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line">
            <TabsTrigger value="buttons" icon={<Zap className="w-4 h-4" />}>
              Buttons & Actions
            </TabsTrigger>
            <TabsTrigger value="inputs" icon={<SlidersHorizontal className="w-4 h-4" />}>
              Inputs & Dropdowns
            </TabsTrigger>
            <TabsTrigger value="badges" icon={<Sparkles className="w-4 h-4" />}>
              Badges & Pills
            </TabsTrigger>
            <TabsTrigger value="cards" icon={<Briefcase className="w-4 h-4" />}>
              Cards & Surfaces
            </TabsTrigger>
          </TabsList>

          {/* 1. BUTTONS */}
          <TabsContent value="buttons" className="space-y-8 pt-4">
            <Card radius="3xl">
              <CardHeader>
                <CardTitle>CTA Variants</CardTitle>
                <CardDescription>
                  Strict hierarchy: Primary (BuildAIResume Green), Secondary (Clean surface), Outline, Ghost, Danger, and Accent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
                    Primary CTA
                  </Button>
                  <Button variant="secondary" size="md">
                    Secondary CTA
                  </Button>
                  <Button variant="outline" size="md">
                    Outline
                  </Button>
                  <Button variant="ghost" size="md">
                    Ghost Action
                  </Button>
                  <Button variant="danger" size="md" leftIcon={<Trash2 className="w-4 h-4" />}>
                    Danger Action
                  </Button>
                  <Button variant="accent" size="md">
                    Accent Lime
                  </Button>
                </div>

                <SectionHeader title="3-Tier Control Sizing (sm: 32px, md: 40px, lg: 46px)" />
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="sm">
                    Small (32px)
                  </Button>
                  <Button variant="primary" size="md">
                    Medium (40px) Default
                  </Button>
                  <Button variant="primary" size="lg">
                    Large (46px)
                  </Button>
                </div>

                <SectionHeader title="Layout-Stable Loading States" />
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="md" isLoading loadingText="Saving...">
                    Save Preferences
                  </Button>
                  <Button variant="secondary" size="md" isLoading loadingText="Exporting...">
                    Export PDF
                  </Button>
                </div>

                <SectionHeader title="Icon Buttons & Row Actions" />
                <div className="flex flex-wrap items-center gap-3">
                  <IconButton variant="default" size="sm" aria-label="View">
                    <Eye className="w-3.5 h-3.5" />
                  </IconButton>
                  <IconButton variant="secondary" size="md" aria-label="Edit">
                    <Edit2 className="w-4 h-4" />
                  </IconButton>
                  <IconButton variant="primary" size="md" aria-label="Add">
                    <Plus className="w-4 h-4" />
                  </IconButton>
                  <IconButton variant="danger" size="sm" aria-label="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconButton>

                  <div className="ml-4 pl-4 border-l border-gray-200 dark:border-white/10 flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Table Action Group:</span>
                    <TableActionGroup
                      onView={() => {}}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onDuplicate={() => {}}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. INPUTS & CONTROLS */}
          <TabsContent value="inputs" className="space-y-8 pt-4">
            <Card radius="3xl">
              <CardHeader>
                <CardTitle>Inputs, Search & Dropdowns</CardTitle>
                <CardDescription>
                  Standardized focus ring, clear buttons, left icon slots, and floating animated dropdown menus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Search Input
                    </label>
                    <SearchInput
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder="Search jobs, companies, skills..."
                      size="md"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Dropdown Select
                    </label>
                    <Dropdown
                      options={[
                        { id: 'remote', label: 'Remote Only' },
                        { id: 'hybrid', label: 'Hybrid Work' },
                        { id: 'onsite', label: 'On-site Location' },
                      ]}
                      value={selectedDropdown}
                      onChange={setSelectedDropdown}
                      size="md"
                      width="trigger"
                    />
                  </div>
                </div>

                <SectionHeader title="Toggles & Switches" />
                <div className="space-y-4">
                  <Toggle
                    checked={toggleState}
                    onCheckedChange={handleToggleClick}
                    isLoading={toggleLoading}
                    label="Auto-Apply System"
                    description="Automatically tailor and submit applications daily"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. BADGES & PILLS */}
          <TabsContent value="badges" className="space-y-8 pt-4">
            <Card radius="3xl">
              <CardHeader>
                <CardTitle>Semantic Badges & Filter Pills</CardTitle>
                <CardDescription>
                  Controlled status badges and interactive chips.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="danger">Danger</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="beta">BETA</Badge>
                </div>

                <SectionHeader title="Selectable Filter Pills" />
                <div className="flex flex-wrap items-center gap-2">
                  <Pill
                    selected={activePill}
                    onClick={() => setActivePill((prev) => !prev)}
                    leftIcon={<Zap className="w-3.5 h-3.5" />}
                  >
                    Auto-Apply Supported
                  </Pill>
                  <Pill selected={false} leftIcon={<Shield className="w-3.5 h-3.5" />}>
                    Visa Sponsorship
                  </Pill>
                  <Pill selected={false} leftIcon={<Bookmark className="w-3.5 h-3.5" />}>
                    Saved Only
                  </Pill>
                </div>

                {/*
                  Canonical chip spec — see `src/components/ui/chip-styles.ts`.
                  Every chip in the app is built from that one module.
                */}
                <SectionHeader title="Chip States (the one design)" />
                <div className="flex flex-wrap items-center gap-2">
                  <Pill selected={false}>Idle</Pill>
                  <Pill selected>Active</Pill>
                  <Pill selected={false} disabled>
                    Disabled
                  </Pill>
                  <Pill selected disabled>
                    Active + Disabled
                  </Pill>
                  <Pill selected onClear={() => {}} showCheckmark>
                    Removable
                  </Pill>
                  <Pill selected badgeCount={12}>
                    With count
                  </Pill>
                </div>

                <SectionHeader title="Sizes" />
                <div className="flex flex-wrap items-center gap-2">
                  <Pill size="sm" selected={false}>
                    sm
                  </Pill>
                  <Pill size="sm" selected>
                    sm active
                  </Pill>
                  <Pill size="md" selected={false}>
                    md
                  </Pill>
                  <Pill size="md" selected>
                    md active
                  </Pill>
                  <Pill size="lg" selected={false}>
                    lg
                  </Pill>
                  <Pill size="lg" selected>
                    lg active
                  </Pill>
                </div>

                <SectionHeader title="Status Tones (hue kept, shape unified)" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">Draft</Badge>
                  <Badge tone="green">Queued</Badge>
                  <Badge tone="emerald">Offer</Badge>
                  <Badge tone="sky">Applied</Badge>
                  <Badge tone="violet">Interview</Badge>
                  <Badge tone="amber">Screening</Badge>
                  <Badge tone="rose">Rejected</Badge>
                  <Badge tone="slate">Withdrawn</Badge>
                </div>

                <SectionHeader title="Status Tones — Sizes" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge size="sm" tone="emerald">
                    sm
                  </Badge>
                  <Badge size="md" tone="emerald">
                    md
                  </Badge>
                  <Badge size="lg" tone="emerald">
                    lg
                  </Badge>
                  <Badge size="md" tone="emerald" disabled>
                    disabled
                  </Badge>
                  <Badge size="md" tone="rose" interactive>
                    interactive
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. CARDS & SURFACES */}
          <TabsContent value="cards" className="space-y-8 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card radius="2xl" variant="default" className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="primary">Active Card</Badge>
                  <span className="text-xs text-gray-400">92% Match</span>
                </div>
                <h4 className="font-bold text-base text-gray-900 dark:text-white">
                  Senior Product Designer
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Databricks · Bangalore, India · ₹35 LPA+
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <Button variant="primary" size="sm">
                    Apply Now
                  </Button>
                  <Button variant="secondary" size="sm">
                    View Details
                  </Button>
                </div>
              </Card>

              <Card radius="2xl" variant="interactive" className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="success">Interactive Card</Badge>
                  <span className="text-xs text-gray-400">2d ago</span>
                </div>
                <h4 className="font-bold text-base text-gray-900 dark:text-white">
                  Full Stack Engineer
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Elastic · Remote · $140,000 /yr+
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <Button variant="primary" size="sm">
                    Apply Now
                  </Button>
                  <Button variant="secondary" size="sm">
                    Save
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Preview */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>Standard Modal Dialog</DialogTitle>
              <DialogDescription>
                Unified modal surface with backdrop blur, standardized header, content rhythm, and footer buttons.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              This dialog implements the global design system tokens: rounded-3xl geometry, subtle borders, backdrop blur, and primary CTA placed on the right.
            </div>
            <DialogFooter>
              <Button variant="secondary" size="md" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={() => setIsModalOpen(false)}>
                Confirm Action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

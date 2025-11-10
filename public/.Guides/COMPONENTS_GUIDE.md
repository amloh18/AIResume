# CVCircle.io - Components Guide

**Version**: 1.0  
**Last Updated**: November 2025  
**Purpose**: Complete reference for all components, modals, dialogs, and sections

---

## 📋 Table of Contents

1. [Landing Page Components](#landing-page-components)
2. [Authentication Components](#authentication-components)
3. [Dashboard Components](#dashboard-components)
4. [CV Studio Components](#cv-studio-components)
5. [Modal Components](#modal-components)
6. [Dialog Components](#dialog-components)
7. [CV Section Components](#cv-section-components)
8. [UI Components](#ui-components)
9. [Admin Components](#admin-components)
10. [Onboarding Components](#onboarding-components)

---

## 🏠 Landing Page Components

**Location**: `src/components/landing/`

### Hero.tsx
- **Purpose**: Main hero section with value proposition
- **Features**: 
  - Headline and subheadline
  - Call-to-action buttons
  - Animated background
  - Responsive design

### Features.tsx
- **Purpose**: Display platform features
- **Features**:
  - Feature cards with icons
  - Feature descriptions
  - Hover effects
  - Grid layout

### PremiumTemplates.tsx
- **Purpose**: Showcase CV templates
- **Features**:
  - Template preview cards
  - Template descriptions
  - Template selection
  - Link to templates page

### Pricing.tsx
- **Purpose**: Display pricing plans
- **Features**:
  - Pricing tiers (Free, Premium, Enterprise)
  - Feature comparison
  - CTA buttons
  - Responsive cards

### FAQ.tsx
- **Purpose**: Frequently asked questions
- **Features**:
  - Accordion-style questions
  - Expandable answers
  - Search functionality
  - Categorized questions

### Footer.tsx
- **Purpose**: Site footer with links
- **Features**:
  - Navigation links
  - Social media links
  - Legal links
  - Copyright information

### HowItWorks.tsx
- **Purpose**: Explain how the platform works
- **Features**:
  - Step-by-step guide
  - Visual illustrations
  - Interactive elements

### Testimonials.tsx
- **Purpose**: Display user testimonials
- **Features**:
  - Testimonial cards
  - User avatars
  - Star ratings
  - Carousel/slider

### ChromeExtension.tsx
- **Purpose**: Promote Chrome extension
- **Features**:
  - Extension benefits
  - Installation CTA
  - Feature highlights

### LaunchBanner.tsx
- **Purpose**: Promotional banner
- **Features**:
  - Announcement text
  - Dismissible
  - Link to promotion

### CardNav.tsx
- **Purpose**: Navigation bar
- **Features**:
  - Logo
  - Navigation links
  - Auth buttons
  - Mobile menu

---

## 🔐 Authentication Components

**Location**: `src/components/auth/`

### UnifiedAuthPage.tsx
- **Purpose**: Main authentication page wrapper
- **Features**:
  - Handles sign-in and sign-up
  - Tab switching
  - Form validation
  - Error handling

### SignInForm.tsx
- **Purpose**: Sign in form
- **Features**:
  - Email/password input
  - Google OAuth button
  - Remember me checkbox
  - Forgot password link
  - Form validation

### SignUpForm.tsx
- **Purpose**: Registration form
- **Features**:
  - Email/password input
  - Password confirmation
  - Terms acceptance
  - Google OAuth option
  - Form validation

### CodeVerificationScreen.tsx
- **Purpose**: Email verification code input
- **Features**:
  - 4-digit code input
  - Code validation
  - Resend code option
  - Timer countdown

### UnifiedAuthForm.tsx
- **Purpose**: Unified auth form component
- **Features**:
  - Handles both sign-in and sign-up
  - Dynamic form fields
  - Validation logic

### UnifiedAuthLayout.tsx
- **Purpose**: Auth page layout
- **Features**:
  - Consistent styling
  - Background design
  - Logo placement

### SocialAuthButtons.tsx
- **Purpose**: Social login buttons
- **Features**:
  - Google OAuth button
  - Other social providers (if added)
  - Loading states

### CustomSignInForm.tsx
- **Purpose**: Custom sign-in implementation
- **Features**:
  - Alternative sign-in flow
  - Custom validation

### OnboardingForm.tsx
- **Purpose**: Onboarding form
- **Features**:
  - Multi-step form
  - Progress indicator
  - Data collection

### RouteGuard.tsx
- **Purpose**: Protect routes
- **Features**:
  - Authentication check
  - Redirect logic
  - Loading states

### InlineMessages.tsx
- **Purpose**: Display inline messages
- **Features**:
  - Success messages
  - Error messages
  - Info messages

### RegistrationModal.tsx
- **Purpose**: Registration modal
- **Features**:
  - Modal wrapper
  - Registration form
  - Close functionality

### ChangePasswordModal.tsx
- **Purpose**: Change password modal
- **Features**:
  - Current password input
  - New password input
  - Confirmation input
  - Validation

---

## 📊 Dashboard Components

**Location**: `src/components/dashboard/`

### OptimizedDashboardLayout.tsx
- **Purpose**: Main dashboard layout
- **Features**:
  - Sidebar navigation
  - Header with user info
  - Main content area
  - Responsive design

### OptimizedNavigation.tsx
- **Purpose**: Dashboard navigation sidebar
- **Features**:
  - Navigation links
  - Active route highlighting
  - User profile section
  - Logout button

### Analytics.tsx
- **Purpose**: Analytics dashboard
- **Features**:
  - Charts and graphs
  - Key metrics
  - Data visualization
  - Time range filters

### ApplicationTracker.tsx
- **Purpose**: Job application tracker
- **Features**:
  - Job list view
  - Status filters
  - Search functionality
  - Add/edit jobs

### ApplicationStatsWidget.tsx
- **Purpose**: Application statistics widget
- **Features**:
  - Total applications
  - Status breakdown
  - Success rate
  - Visual charts

### AnalyticsJourneyWidget.tsx
- **Purpose**: Journey analytics widget
- **Features**:
  - Journey completion rates
  - Step-by-step analytics
  - Visual progress

### ProgressTrackingWidget.tsx
- **Purpose**: Progress tracking widget
- **Features**:
  - Application progress
  - Timeline view
  - Milestones

### JourneyTimelineCard.tsx
- **Purpose**: Journey timeline display
- **Features**:
  - Timeline visualization
  - Step indicators
  - Progress tracking

### NewJourneyCard.tsx
- **Purpose**: Create new journey card
- **Features**:
  - Quick start button
  - Journey template selection
  - Job details input

### MasterCVCard.tsx
- **Purpose**: Master CV card display
- **Features**:
  - CV preview
  - Edit button
  - Download option
  - Status indicator

### MasterCVCardOverlay.tsx
- **Purpose**: Master CV card overlay
- **Features**:
  - Hover effects
  - Quick actions
  - Preview modal

### CVCardOverlay.tsx
- **Purpose**: CV card overlay
- **Features**:
  - CV actions menu
  - Quick preview
  - Edit/delete options

### CVPreviewThumbnail.tsx
- **Purpose**: CV preview thumbnail
- **Features**:
  - Thumbnail image
  - Template indicator
  - Quick view

### CoverLetterPreviewThumbnail.tsx
- **Purpose**: Cover letter preview
- **Features**:
  - Cover letter thumbnail
  - Quick preview
  - Edit option

### CoverLetterCardOverlay.tsx
- **Purpose**: Cover letter card overlay
- **Features**:
  - Hover actions
  - Quick edit
  - Delete option

### JobInfoContent.tsx
- **Purpose**: Job information display
- **Features**:
  - Job details
  - Company information
  - Application status
  - Notes section

### JobModal.tsx
- **Purpose**: Job details modal
- **Features**:
  - Full job information
  - Edit functionality
  - Application tracking
  - Notes and attachments

### Canvas.tsx
- **Purpose**: Canvas view component
- **Features**:
  - Visual canvas
  - Drag and drop
  - Item organization

### PageHeader.tsx
- **Purpose**: Page header component
- **Features**:
  - Page title
  - Breadcrumbs
  - Action buttons

### UpgradePopup.tsx
- **Purpose**: Upgrade prompt popup
- **Features**:
  - Upgrade messaging
  - Feature highlights
  - CTA button
  - Dismissible

### OnboardingCarouselModal.tsx
- **Purpose**: Onboarding carousel
- **Features**:
  - Multi-step tutorial
  - Feature highlights
  - Progress indicator

### CVCheckRedirect.tsx
- **Purpose**: CV check and redirect
- **Features**:
  - CV validation
  - Redirect logic
  - Error handling

---

## 🎨 CV Studio Components

**Location**: `src/components/studio/`

### CVStudio.tsx
- **Purpose**: Main CV studio component
- **Features**:
  - Studio layout management
  - State management
  - Template system integration
  - Auto-save functionality

### RestructuredStudioLayout.tsx
- **Purpose**: Restructured studio layout
- **Features**:
  - Split-panel design
  - Editor and preview panels
  - Responsive layout

### FloatingStudioLayout.tsx
- **Purpose**: Floating studio layout
- **Features**:
  - Floating panels
  - Drag and drop
  - Resizable panels

### SidebarStudioPanel.tsx
- **Purpose**: Sidebar panel
- **Features**:
  - Section navigation
  - Quick actions
  - Settings access

### TabbedStudioPanel.tsx
- **Purpose**: Tabbed panel interface
- **Features**:
  - Multiple tabs
  - Tab switching
  - Tab content

### StructurePanel.tsx
- **Purpose**: CV structure panel
- **Features**:
  - Section list
  - Section reordering
  - Section visibility toggle

### PreviewPanel.tsx
- **Purpose**: CV preview panel
- **Features**:
  - Live preview
  - Template selector
  - Export options
  - Zoom controls

### CVPreview.tsx
- **Purpose**: CV preview component
- **Features**:
  - CV rendering
  - Template application
  - Print preview

### CVPreviewContent.tsx
- **Purpose**: CV preview content
- **Features**:
  - Content rendering
  - Section display
  - Styling

### TemplateSelector.tsx
- **Purpose**: Template selection
- **Features**:
  - Template grid
  - Template preview
  - Template selection
  - Template customization

### TemplateContent.tsx
- **Purpose**: Template content display
- **Features**:
  - Template options
  - Customization settings
  - Preview updates

### DesignContent.tsx
- **Purpose**: Design customization
- **Features**:
  - Color picker
  - Font selection
  - Layout options
  - Style settings

### DesignPanel.tsx
- **Purpose**: Design panel
- **Features**:
  - Design tools
  - Style options
  - Preview updates

### ComprehensiveATSAnalyzer.tsx
- **Purpose**: ATS analysis tool
- **Features**:
  - ATS score calculation
  - Keyword analysis
  - Optimization suggestions
  - Score breakdown

### AIAssistantPanel.tsx
- **Purpose**: AI assistant panel
- **Features**:
  - AI suggestions
  - Content improvement
  - Keyword optimization
  - Career advice

### AIEnhancedFormField.tsx
- **Purpose**: AI-enhanced form field
- **Features**:
  - AI suggestions
  - Auto-complete
  - Content enhancement

### CVSelector.tsx
- **Purpose**: CV selection component
- **Features**:
  - CV list
  - CV selection
  - CV preview

### JobSelector.tsx
- **Purpose**: Job selection
- **Features**:
  - Job list
  - Job selection
  - Job details

### JobSection.tsx
- **Purpose**: Job-specific section
- **Features**:
  - Job details display
  - Job requirements
  - Tailoring options

### MasterCVCard.tsx
- **Purpose**: Master CV card in studio
- **Features**:
  - Master CV display
  - Quick actions
  - Status indicator

### CoverLetterPreview.tsx
- **Purpose**: Cover letter preview
- **Features**:
  - Cover letter rendering
  - Template application
  - Edit functionality

### CoverLetterDesignContent.tsx
- **Purpose**: Cover letter design
- **Features**:
  - Design customization
  - Style options
  - Preview

### CoverLetterStructureContent.tsx
- **Purpose**: Cover letter structure
- **Features**:
  - Structure editing
  - Section management
  - Content organization

### CoverLetterTemplateContent.tsx
- **Purpose**: Cover letter templates
- **Features**:
  - Template selection
  - Template customization
  - Preview

### Form Components (studio/forms/)

#### PersonalInfoForm.tsx
- **Purpose**: Personal information form
- **Features**: Name, contact, location, profiles

#### WorkExperienceSection.tsx
- **Purpose**: Work experience editing
- **Features**: Job history, achievements, dates

#### EducationSection.tsx
- **Purpose**: Education editing
- **Features**: Degrees, institutions, dates

#### SkillsSection.tsx
- **Purpose**: Skills editing
- **Features**: Technical skills, soft skills, levels

#### ProjectsSection.tsx
- **Purpose**: Projects editing
- **Features**: Project details, descriptions, links

#### CertificatesSection.tsx
- **Purpose**: Certificates editing
- **Features**: Certificate details, dates, issuers

#### LanguagesSection.tsx
- **Purpose**: Languages editing
- **Features**: Language list, proficiency levels

#### VolunteerSection.tsx
- **Purpose**: Volunteer experience
- **Features**: Volunteer work, organizations, dates

#### AwardsSection.tsx
- **Purpose**: Awards editing
- **Features**: Award details, dates, descriptions

#### PublicationsSection.tsx
- **Purpose**: Publications editing
- **Features**: Publication details, links, dates

#### ReferencesSection.tsx
- **Purpose**: References editing
- **Features**: Reference contacts, relationships

#### InterestsSection.tsx
- **Purpose**: Interests editing
- **Features**: Interest list, descriptions

#### EducationForm.tsx
- **Purpose**: Education form component
- **Features**: Education input fields, validation

---

## 🪟 Modal Components

**Location**: `src/components/modals/`

### ApplicationJourneyModal.tsx
- **Purpose**: Application journey modal
- **Features**:
  - 5-step journey wizard
  - Job details input
  - CV selection
  - Cover letter generation
  - Application tracking

### CVSelectionModal.tsx
- **Purpose**: CV selection modal
- **Features**:
  - CV list display
  - CV selection
  - CV preview
  - Create new CV option

### CoverLetterSelectionModal.tsx
- **Purpose**: Cover letter selection
- **Features**:
  - Cover letter list
  - Cover letter selection
  - Create new option

### EditJobModal.tsx
- **Purpose**: Edit job modal
- **Features**:
  - Job details form
  - Status update
  - Notes editing
  - Save/cancel

### JourneyCreationModal.tsx
- **Purpose**: Create new journey
- **Features**:
  - Journey setup
  - Job selection
  - Initial configuration

### MoveToAppliedModal.tsx
- **Purpose**: Move job to applied status
- **Features**:
  - Status change confirmation
  - Date selection
  - Notes input

### ActionBlockerDialog.tsx
- **Purpose**: Action blocker dialog
- **Features**:
  - Warning message
  - Confirmation required
  - Action blocking

---

## 💬 Dialog Components

**Location**: `src/components/ui/` (Dialog component)

### Dialog.tsx
- **Purpose**: Base dialog component
- **Features**:
  - Modal overlay
  - Close button
  - Animation
  - Accessibility

### AlertDialog.tsx
- **Purpose**: Alert dialog
- **Features**:
  - Warning messages
  - Confirmation buttons
  - Action buttons

---

## 📄 CV Section Components

**Location**: `src/components/cv-sections/`

### PersonalHeader.tsx
- **Purpose**: Personal header section
- **Features**:
  - Name display
  - Contact information
  - Profile image
  - Location

### WorkExperience.tsx
- **Purpose**: Work experience section
- **Features**:
  - Job listings
  - Company names
  - Dates
  - Descriptions

### Education.tsx
- **Purpose**: Education section
- **Features**:
  - Degree listings
  - Institution names
  - Dates
  - Descriptions

### Skills.tsx
- **Purpose**: Skills section
- **Features**:
  - Skill categories
  - Skill levels
  - Skill tags

### Projects.tsx
- **Purpose**: Projects section
- **Features**:
  - Project listings
  - Descriptions
  - Links
  - Technologies

### Awards.tsx
- **Purpose**: Awards section
- **Features**:
  - Award listings
  - Dates
  - Descriptions

### Certificates.tsx
- **Purpose**: Certificates section
- **Features**:
  - Certificate listings
  - Issuers
  - Dates
  - Credentials

### Languages.tsx
- **Purpose**: Languages section
- **Features**:
  - Language listings
  - Proficiency levels
  - Certifications

### Publications.tsx
- **Purpose**: Publications section
- **Features**:
  - Publication listings
  - Links
  - Dates
  - Descriptions

### Volunteer.tsx
- **Purpose**: Volunteer section
- **Features**:
  - Volunteer listings
  - Organizations
  - Dates
  - Descriptions

### Profile.tsx
- **Purpose**: Profile section
- **Features**:
  - Social profiles
  - Links
  - Icons

---

## 🎨 UI Components

**Location**: `src/components/ui/`

### Form Components
- **Input.tsx**: Text input field
- **Textarea.tsx**: Multi-line text input
- **Select.tsx**: Dropdown select
- **Checkbox.tsx**: Checkbox input
- **Radio.tsx**: Radio button
- **DatePicker.tsx**: Date selection

### Display Components
- **Card.tsx**: Card container
- **Badge.tsx**: Badge/label
- **Avatar.tsx**: User avatar
- **Progress.tsx**: Progress bar
- **Skeleton.tsx**: Loading skeleton

### Interactive Components
- **Button.tsx**: Button component
- **Dialog.tsx**: Dialog/modal
- **Dropdown.tsx**: Dropdown menu
- **Tabs.tsx**: Tab interface
- **Accordion.tsx**: Accordion component
- **Tooltip.tsx**: Tooltip

### Layout Components
- **Container.tsx**: Container wrapper
- **Grid.tsx**: Grid layout
- **Flex.tsx**: Flex layout
- **Separator.tsx**: Separator line

**Total**: 32 UI components (all active)

---

## 👨‍💼 Admin Components

**Location**: `src/components/admin/`

### AdminKPIs.tsx
- **Purpose**: Admin KPI dashboard
- **Features**: Key metrics, charts, statistics

### UserManagement.tsx
- **Purpose**: User management
- **Features**: User list, search, filters, actions

### PricingPlanManager.tsx
- **Purpose**: Pricing plan management
- **Features**: Plan CRUD, pricing configuration

### TemplateManager.tsx
- **Purpose**: Template management
- **Features**: Template CRUD, preview, activation

### DiscountCodeManager.tsx
- **Purpose**: Discount code management
- **Features**: Code creation, validation, usage tracking

### EmailCampaignManager.tsx
- **Purpose**: Email campaign management
- **Features**: Campaign creation, targeting, analytics

### CampaignEditor.tsx
- **Purpose**: Campaign editor
- **Features**: Content editing, targeting, scheduling

### CampaignFilters.tsx
- **Purpose**: Campaign filters
- **Features**: User segmentation, filter configuration

### SystemHealth.tsx
- **Purpose**: System health monitoring
- **Features**: System metrics, status, alerts

### RecentActivity.tsx
- **Purpose**: Recent activity feed
- **Features**: Activity log, filtering, search

### DraftManagement.tsx
- **Purpose**: Draft management
- **Features**: Draft list, review, approval

### DraftDetailModal.tsx
- **Purpose**: Draft detail modal
- **Features**: Draft preview, details, actions

### LogsViewer.tsx
- **Purpose**: Logs viewer
- **Features**: Log display, filtering, search

### NotificationManager.tsx
- **Purpose**: Notification management
- **Features**: Notification settings, templates

### RevenueManager.tsx
- **Purpose**: Revenue management
- **Features**: Revenue tracking, analytics

### PaymentPartnerStats.tsx
- **Purpose**: Payment partner statistics
- **Features**: Payment metrics, analytics

### TestimonialManager.tsx
- **Purpose**: Testimonial management
- **Features**: Testimonial CRUD, moderation

### PromotionalOfferManager.tsx
- **Purpose**: Promotional offer management
- **Features**: Offer creation, configuration

### UserActivityModal.tsx
- **Purpose**: User activity modal
- **Features**: User activity details, timeline

### CVJourneyKPIs.tsx
- **Purpose**: CV journey KPIs
- **Features**: Journey metrics, analytics

### AIAnalytics.tsx
- **Purpose**: AI analytics
- **Features**: AI usage metrics, insights

### PreviewBridge.tsx
- **Purpose**: Preview bridge component
- **Features**: Preview functionality, integration

### PricingPlanCard.tsx
- **Purpose**: Pricing plan card
- **Features**: Plan display, features, pricing

### PricingPlanEditModal.tsx
- **Purpose**: Pricing plan edit modal
- **Features**: Plan editing, configuration

### RecentActivityPanel.tsx
- **Purpose**: Recent activity panel
- **Features**: Activity feed, filtering

### AdminSkeletons.tsx
- **Purpose**: Admin loading skeletons
- **Features**: Loading states, placeholders

---

## 🎓 Onboarding Components

**Location**: `src/components/onboarding/`

### MasterCVCreationWizard.tsx
- **Purpose**: Master CV creation wizard
- **Features**: Multi-step wizard, progress tracking

### PersonalInfoStep.tsx
- **Purpose**: Personal info step
- **Features**: Personal information form

### ExperienceStep.tsx
- **Purpose**: Experience step
- **Features**: Work experience form

### EducationStep.tsx
- **Purpose**: Education step
- **Features**: Education form

### SkillsStep.tsx
- **Purpose**: Skills step
- **Features**: Skills form

### CompletionStep.tsx
- **Purpose**: Completion step
- **Features**: Summary, confirmation

---

## 📊 Component Statistics

- **Total Components**: ~200+ components
- **Landing Components**: 10
- **Auth Components**: 14
- **Dashboard Components**: 24
- **Studio Components**: 53
- **Modal Components**: 6 (active)
- **CV Section Components**: 11
- **UI Components**: 32
- **Admin Components**: 26
- **Onboarding Components**: 11

---

**Document Status**: Active  
**Maintained By**: Development Team  
**Review Cycle**: Monthly


# Plan: Fix Settings Page

## Summary
This plan outlines the steps to overhaul the Settings page to align with the provided design for Membership & Billing, fully implement the Two-Factor Authentication (2FA) flow with code verification, handle social login gracefully in the Security section, and decouple the Account & Profile section from the master CV while ensuring the user's avatar is automatically applied to new CVs. It also ensures UI consistency with the dashboard's light/dark mode styling.

## Current State Analysis
- **Membership & Billing**: Currently displays a simple card for the active plan and a placeholder "Change Plan" card. It does not match the detailed layout in the provided image.
- **Security & Notifications**: The password change form is always visible (even for Google/Apple logins). The 2FA toggle just shows a "coming soon" toast and does not actually enable 2FA or send verification codes.
- **Account & Profile**: Contains a "Sync from Master CV" button. Avatar upload saves to S3, but this avatar is not automatically injected when a new CV is created.
- **UI/Theme**: Some hardcoded colors or inconsistent card styles exist. The dashboard uses specific classes like `glass-widget-premium` (which maps to `#f9fafb` in light and `#141810` in dark mode) and page backgrounds (`#f3f2ee` light, `#1a230f` dark) that need to be respected.

## Proposed Changes

### 1. Membership & Billing UI Overhaul
- **File**: `src/app/dashboard/settings/page.tsx` (in `MembershipBilling` component)
- **Changes**:
  - Restructure the top section into a two-column grid (on desktop):
    - **Left Column (Current Plan)**: Display the active plan using `glass-widget-premium` styling, showing the active badge, renewal date, price, and billing history link.
    - **Right Column (Upgrade Your Plan)**: Display a promotional box highlighting features (More Credits, Priority Support, etc.) with a "View All Plans & Upgrade" button.
  - Add a **Compare Plans** section below the top row. Import and render the existing `Pricing` component from `src/components/landing/Pricing.tsx` to display the detailed pricing cards, passing a callback to open the `UniversalPaymentModal` when a plan is selected.

### 2. Security & Notifications Enhancements (2FA & Social Login)
- **File**: `src/app/dashboard/settings/page.tsx` (in `SecurityAndNotifications` component)
- **Changes**:
  - **Graceful Social Login Handling**: Check `user.authProvider` (or if the user has no password set). If they use a social provider, hide the "Change Password" form entirely and display a graceful message ("Your account is linked via your provider. Password management is handled there.").
  - **Complete 2FA Flow**:
    - Replace the "coming soon" toast with an actual flow.
    - When a user clicks to **Enable 2FA**, invoke an API endpoint (e.g., `POST /api/auth/two-factor/generate` which already exists) to send a 4-digit code to their email.
    - Display an inline form or modal to enter the 4-digit code.
    - Verify the code by calling a new or updated endpoint (`POST /api/user/settings/security/2fa/confirm`) which verifies the code via `verifyTwoFactorCode` and updates the user's settings to `twoFactorEnabled = true`.
    - When **Disabling 2FA**, prompt for the user's password (if they have one) or bypass/use a code if they are a social login user, then call the existing `PUT /api/user/settings/security` with `action: 'disableTwoFactor'`.

### 3. Account & Profile Standalone Mode
- **File**: `src/app/dashboard/settings/page.tsx` (in `AccountAndProfile` component)
- **Changes**:
  - Remove the "Sync from Master CV" button from the header.
  - Remove the `refreshFromMasterCV` function and the `useEffect` that auto-populates the profile/avatar from the master CV on load.
  - The avatar upload will continue to use `uploadToS3` (already implemented) and save the URL to the user profile via `PUT /api/user`.

### 4. Automatic Avatar Injection for New CVs
- **File**: `src/app/api/cvs/route.ts`
- **Changes**:
  - In the `POST` handler, after fetching the user object, check if `cvDataToCreate.cvData.basics.image` is empty.
  - If empty and the `user.avatar` exists, assign `cvDataToCreate.cvData.basics.image = user.avatar`. This ensures any newly created CV automatically inherits the user's uploaded avatar.

### 5. Overall UI and Dark Mode Consistency
- **File**: `src/app/dashboard/settings/page.tsx`
- **Changes**:
  - Ensure all cards and inputs use consistent theme classes (e.g., `glass-widget-premium`, `bg-white dark:bg-[#141810]`, `text-gray-900 dark:text-white`).
  - Do not hardcode `#1A2015`; rely on the global CSS variables and dashboard layout classes to ensure the dark/light mode seamlessly matches the rest of the dashboard UI.
  - Standardize padding, gap spacing, and border radius across all settings tabs.

## Assumptions & Decisions
- The existing `Pricing` component can be rendered inside the dashboard without breaking the layout.
- The `generateAndSendTwoFactorCode` and `verifyTwoFactorCode` utilities in `src/lib/services/twoFactorService.ts` will be reused to implement the 2FA enablement flow.
- Avatar injection will only happen at CV creation time. If a user updates their avatar in Settings later, existing CVs will not be retroactively updated.

## Verification Steps
1. Navigate to Settings -> Membership & Billing and verify the layout matches the image, including the Compare Plans section.
2. Navigate to Settings -> Security & Notifications with a Google-authenticated account and verify the password form is hidden.
3. Toggle "Enable 2FA", verify an email code is sent, enter the code, and verify 2FA becomes enabled.
4. Navigate to Settings -> Account & Profile and verify the "Sync from Master CV" button is gone.
5. Upload an avatar in Account & Profile, save, then create a new CV and verify the avatar appears in the CV's `basics.image` data.
6. Toggle between light and dark mode to verify the settings page colors match the main dashboard.
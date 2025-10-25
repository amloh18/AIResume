#!/bin/bash

# CVCircle.io - Cleanup Unused Files Script
# This script removes deprecated and unused components identified in .guide/structured.md

set -e  # Exit on error

echo "🧹 CVCircle.io - Cleanup Unused Files"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
REMOVED_COUNT=0

# Function to safely remove file/folder
safe_remove() {
    local path="$1"
    if [ -e "$path" ]; then
        echo -e "${YELLOW}Removing:${NC} $path"
        rm -rf "$path"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${RED}✗ Not found:${NC} $path (already removed?)"
    fi
    echo ""
}

echo "Phase 1: Removing Deprecated Onboarding Pages"
echo "---------------------------------------------"
safe_remove "src/app/onboarding"
safe_remove "src/app/onboarding-universal"
safe_remove "src/components/onboarding-universal"

echo ""
echo "Phase 2: Removing Unused Dashboard Pages"
echo "----------------------------------------"
safe_remove "src/app/dashboard/pipeline"
safe_remove "src/app/dashboard/premium-job-tracker"
safe_remove "src/app/dashboard/quillbox"
safe_remove "src/app/dashboard/inkpad"

echo ""
echo "Phase 3: Removing Unused Modal Components"
echo "-----------------------------------------"
safe_remove "src/components/modals/WelcomeOnboardingModal.tsx"
safe_remove "src/components/modals/CelebrationModal.tsx"
safe_remove "src/components/modals/OnboardingModal.tsx"

echo ""
echo "Phase 4: Removing Unused Onboarding Components"
echo "----------------------------------------------"
safe_remove "src/components/onboarding/WelcomeModal.tsx"
safe_remove "src/components/onboarding/AuthModal.tsx"

echo ""
echo "Phase 5: Removing Unused Auth Components"
echo "----------------------------------------"
safe_remove "src/components/auth/TwoFactorModal.tsx"
safe_remove "src/components/auth/GoogleOneTap.tsx"

echo ""
echo "Phase 6: Removing Unused Dashboard Components"
echo "---------------------------------------------"
safe_remove "src/components/dashboard/DashboardRouter.tsx"
safe_remove "src/components/dashboard/LoadingDashboard.tsx"

echo ""
echo "Phase 7: Removing Unused API Routes"
echo "-----------------------------------"
safe_remove "src/app/api/beta-signup"
safe_remove "src/app/api/documents"
safe_remove "src/app/api/jobs/parsed"
safe_remove "src/app/api/cv-sessions"
safe_remove "src/app/api/test-firebase-auth"

echo ""
echo "Phase 8: Removing Test/Debug Components"
echo "---------------------------------------"
safe_remove "src/components/test"
safe_remove "src/components/preview"

echo ""
echo "======================================"
echo -e "${GREEN}✓ Cleanup Complete!${NC}"
echo ""
echo "Summary:"
echo "  Files/Folders removed: $REMOVED_COUNT"
echo ""
echo "Next steps:"
echo "  1. Run: npm run build"
echo "  2. Test the application thoroughly"
echo "  3. Commit changes if everything works"
echo ""
echo "Recommended test checklist:"
echo "  □ Landing page loads"
echo "  □ Sign up works"
echo "  □ Sign in works"
echo "  □ Master CV onboarding works"
echo "  □ Dashboard loads"
echo "  □ Application journey works"
echo "  □ CV Studio works"
echo "  □ Settings work"
echo "  □ Logout works"
echo ""


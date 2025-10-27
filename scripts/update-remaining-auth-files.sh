#!/bin/bash

# Script to update remaining API routes to use NextAuth instead of Firebase
# This script performs find-and-replace operations on the remaining files

echo "🚀 Starting auth system update for remaining files..."
echo ""

# Define the project root
PROJECT_ROOT="/Users/amlohsl/Documents/VScode_projects/PROJECTS/Circle_CV_app"

# List of files to update
FILES=(
  "src/app/api/jobs/[id]/route.ts"
  "src/app/api/cvs/master/route.ts"
  "src/app/api/cover-letters/duplicate/route.ts"
  "src/app/api/cvs/duplicate/route.ts"
  "src/app/api/application-journey/route.ts"
  "src/app/api/user/create-profile/route.ts"
  "src/app/api/auth/verify-and-signin/route.ts"
  "src/app/api/auth/confirm-reset/route.ts"
  "src/app/master-cv-onboarding/page.tsx"
  "src/app/sign-up/[[...sign-up]]/page.tsx"
  "src/lib/auth.ts"
  "src/lib/services/calendarService.ts"
)

echo "📋 Files to update: ${#FILES[@]}"
echo ""

# Function to update imports
update_imports() {
  local file="$1"
  
  echo "  Updating imports..."
  
  # Replace authOptions with authConfig
  sed -i '' 's/from.*@\/lib\/auth.*/from '\''@\/lib\/auth-config'\'';/g' "$file"
  sed -i '' 's/authOptions/authConfig/g' "$file"
  
  # Remove Firebase-related imports
  sed -i '' '/from.*firebase.*$/d' "$file"
  sed -i '' '/import.*firebase.*$/d' "$file"
  sed -i '' '/import.*unified-auth.*$/d' "$file"
  sed -i '' '/import.*google-auth.*$/d' "$file"
  sed -i '' '/from.*firebase-uid-utils.*$/d' "$file"
  sed -i '' '/import.*extractUserIdentifier.*$/d' "$file"
  sed -i '' '/import.*findManyByFirebaseUid.*$/d' "$file"
  sed -i '' '/import.*findByFirebaseUid.*$/d' "$file"
  sed -i '' '/import.*createWithFirebaseUid.*$/d' "$file"
  sed -i '' '/import.*countByFirebaseUid.*$/d' "$file"
  
  # Replace getUnifiedAuth with getAuthenticatedUser
  sed -i '' 's/from.*@\/lib\/auth-helpers.*/from '\''@\/lib\/auth-helpers'\'';/g' "$file"
  
  # Add User import if not present
  if ! grep -q "import.*User.*from.*@\/models" "$file"; then
    # Find the line with models import and add User to it
    sed -i '' 's/from.*@\/models.*/&, User/' "$file" 2>/dev/null || true
  fi
}

# Function to log file processing
process_file() {
  local file="$1"
  local full_path="$PROJECT_ROOT/$file"
  
  echo "📝 Processing: $file"
  
  if [ ! -f "$full_path" ]; then
    echo "  ⚠️  File not found, skipping..."
    echo ""
    return
  fi
  
  # Create backup
  cp "$full_path" "$full_path.backup"
  
  # Update imports
  update_imports "$full_path"
  
  echo "  ✅ Imports updated"
  echo ""
}

# Process each file
for file in "${FILES[@]}"; do
  process_file "$file"
done

echo ""
echo "✅ Import updates complete!"
echo ""
echo "⚠️  IMPORTANT: Manual review required for:"
echo "  1. Replace getUnifiedAuth() with getAuthenticatedUser()"
echo "  2. Update auth logic to use NextAuth session"
echo "  3. Remove Firebase-specific logic (firebaseUid checks, etc.)"
echo "  4. Test each updated endpoint"
echo ""
echo "📚 See FINAL_MIGRATION_TASKS.md for detailed patterns"
echo ""
echo "🔄 Backup files created with .backup extension"
echo "   To restore: mv file.backup file"
echo ""


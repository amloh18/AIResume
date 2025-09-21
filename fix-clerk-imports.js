#!/usr/bin/env node

/**
 * Script to fix Clerk import conflicts in API routes
 * Replaces Clerk imports with NextAuth imports in files that use getServerSession
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all API files that have both Clerk imports and NextAuth usage
function findConflictingFiles() {
  try {
    const clerkFiles = execSync(
      'find src/app/api -name "*.ts" -exec grep -l "@clerk/nextjs" {} \\;',
      { encoding: 'utf8' }
    ).trim().split('\n').filter(f => f);
    
    const conflictingFiles = [];
    
    for (const file of clerkFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('getServerSession') && content.includes('authOptions')) {
          conflictingFiles.push(file);
        }
      } catch (err) {
        console.log(`Warning: Could not read ${file}`);
      }
    }
    
    return conflictingFiles;
  } catch (err) {
    console.error('Error finding files:', err.message);
    return [];
  }
}

// Fix a single file
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace Clerk import with NextAuth imports
    if (content.includes("import { auth } from '@clerk/nextjs';")) {
      content = content.replace(
        "import { auth } from '@clerk/nextjs';",
        "import { getServerSession } from 'next-auth';\nimport { authOptions } from '@/lib/auth';"
      );
      modified = true;
    }
    
    // Remove any remaining Clerk references if NextAuth is already being used
    if (content.includes("const { userId } = auth();") && content.includes("getServerSession")) {
      content = content.replace(
        "const { userId } = auth();",
        "// Clerk auth removed - using NextAuth instead"
      );
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error fixing ${filePath}:`, err.message);
    return false;
  }
}

// Main function
function main() {
  console.log('🔍 Finding API routes with Clerk/NextAuth conflicts...');
  
  const conflictingFiles = findConflictingFiles();
  
  if (conflictingFiles.length === 0) {
    console.log('✅ No conflicting files found!');
    return;
  }
  
  console.log(`Found ${conflictingFiles.length} files with conflicts:`);
  conflictingFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');
  
  let fixedCount = 0;
  
  for (const file of conflictingFiles) {
    if (fixFile(file)) {
      fixedCount++;
    }
  }
  
  console.log('');
  console.log(`📊 Summary:`);
  console.log(`  Total files: ${conflictingFiles.length}`);
  console.log(`  Fixed: ${fixedCount}`);
  console.log(`  Skipped: ${conflictingFiles.length - fixedCount}`);
  
  if (fixedCount > 0) {
    console.log('');
    console.log('🎉 Clerk import conflicts have been resolved!');
    console.log('💡 Next steps:');
    console.log('  1. Test your API routes');
    console.log('  2. Check for any remaining build errors');
    console.log('  3. Verify authentication works correctly');
  }
}

main();

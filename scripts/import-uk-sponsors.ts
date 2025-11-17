/**
 * UK Sponsor Registry Import Script
 * 
 * This script downloads and imports UK sponsor registry data from the government CSV.
 * Run this script periodically (weekly recommended) to keep the registry up to date.
 * 
 * Usage:
 *   npx tsx scripts/import-uk-sponsors.ts
 * 
 * Environment Variables Required:
 *   - MONGODB_URI: MongoDB connection string
 *   - NODE_ENV: Environment (development/production)
 */

import mongoose from 'mongoose';
import { importUKSponsors } from '../src/lib/services/sponsorshipRegistryService';

/**
 * Imports UK sponsors into database
 * This script uses the service layer for consistency with API routes
 */
async function runImport() {
  try {
    console.log('🔗 Connecting to database...');
    console.log('📥 Starting UK sponsor registry import...');
    
    const result = await importUKSponsors();

    console.log('\n✅ Import completed!');
    console.log(`   Imported: ${result.imported} new records`);
    console.log(`   Updated: ${result.updated} existing records`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Expired marked: ${result.expiredMarked}`);

  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    if (error.message.includes('UK_SPONSOR_REGISTRY_URL')) {
      console.log('\n📝 Please set UK_SPONSOR_REGISTRY_URL environment variable');
      console.log('   You can find the URL at: https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers');
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run import if script is executed directly
if (require.main === module) {
  runImport()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { runImport as importUKSponsors };


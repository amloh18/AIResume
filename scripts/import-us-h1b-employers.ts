/**
 * US H-1B Employer Import Script
 * 
 * This script imports US H-1B employer data from Department of Labor sources.
 * Run this script periodically (quarterly/annually) to keep the registry up to date.
 * 
 * Usage:
 *   npx tsx scripts/import-us-h1b-employers.ts
 * 
 * Environment Variables Required:
 *   - MONGODB_URI: MongoDB connection string
 *   - NODE_ENV: Environment (development/production)
 * 
 * Note: This script expects a CSV or JSON file with H-1B employer data.
 * You may need to download this from DOL websites or use their APIs if available.
 */

import mongoose from 'mongoose';
import { importUSH1BEmployers } from '../src/lib/services/sponsorshipRegistryService';

/**
 * Imports US H-1B employers into database
 * This script uses the service layer for consistency with API routes
 */
async function runImport() {
  try {
    console.log('🔗 Connecting to database...');
    console.log('📥 Starting US H-1B employer registry import...');
    
    const result = await importUSH1BEmployers();

    console.log('\n✅ Import completed!');
    console.log(`   Imported: ${result.imported} new records`);
    console.log(`   Updated: ${result.updated} existing records`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Deleted (old records): ${result.deleted}`);

  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    if (error.message.includes('US_H1B_DATA_URL')) {
      console.log('\n📝 Please set US_H1B_DATA_URL environment variable');
      console.log('   You can find data at: https://www.dol.gov/agencies/eta/foreign-labor/performance');
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

export { runImport as importUSH1BEmployers };


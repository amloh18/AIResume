/**
 * UK Sponsor Registry Import Script (Standalone)
 * 
 * This is a standalone version that doesn't require server-only modules
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import UKSponsor from '../src/models/UKSponsor';
import { normalizeCompanyName } from '../src/lib/utils/company-name-normalizer';

/**
 * Downloads CSV from a URL
 */
async function downloadCSV(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download CSV: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

/**
 * Parses UK sponsor CSV data
 */
function parseUKSponsorCSV(csvData: string): Array<{
  companyName: string;
  licenceNumber?: string;
  status: string;
  expiryDate?: Date;
}> {
  const lines = csvData.split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file appears to be empty or invalid');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const sponsors: Array<{
    companyName: string;
    licenceNumber?: string;
    status: string;
    expiryDate?: Date;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with quoted fields that may contain commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const record: any = {};

    headers.forEach((header, index) => {
      const value = (values[index] || '').replace(/^"|"$/g, '').trim();
      
      if (header.includes('company') || header.includes('name') || header.includes('organisation') || header.includes('organisation name')) {
        record.companyName = value;
      } else if (header.includes('licence') || header.includes('license') || header.includes('licence number')) {
        record.licenceNumber = value;
      } else if (header.includes('status') || header.includes('licence status')) {
        record.status = value || 'Active';
      } else if (header.includes('expiry') || header.includes('expire') || header.includes('licence expiry date')) {
        if (value) {
          try {
            record.expiryDate = new Date(value);
          } catch (e) {
            // Ignore invalid dates
          }
        }
      }
    });

    if (record.companyName) {
      sponsors.push({
        companyName: record.companyName,
        licenceNumber: record.licenceNumber,
        status: record.status || 'Active',
        expiryDate: record.expiryDate
      });
    }
  }

  return sponsors;
}

/**
 * Imports UK sponsors into database
 */
async function importUKSponsors() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  const csvUrl = process.env.UK_SPONSOR_REGISTRY_URL;
  if (!csvUrl) {
    throw new Error('UK_SPONSOR_REGISTRY_URL environment variable is required');
  }

  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Database connected');

    console.log('📥 Downloading UK sponsor registry CSV...');
    const csvData = await downloadCSV(csvUrl);
    console.log(`✅ Downloaded ${csvData.length} bytes of CSV data`);

    console.log('📊 Parsing CSV data...');
    const sponsors = parseUKSponsorCSV(csvData);
    console.log(`✅ Parsed ${sponsors.length} sponsor records`);

    console.log('💾 Importing sponsors into database...');
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const sponsor of sponsors) {
      try {
        const normalized = normalizeCompanyName(sponsor.companyName);

        const result = await UKSponsor.findOneAndUpdate(
          { 
            normalizedName: normalized,
            licenceNumber: sponsor.licenceNumber || { $exists: false }
          },
          {
            companyName: sponsor.companyName,
            normalizedName: normalized,
            licenceNumber: sponsor.licenceNumber,
            status: sponsor.status,
            expiryDate: sponsor.expiryDate,
            updatedAt: new Date()
          },
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true
          }
        );

        if (result.isNew) {
          imported++;
        } else {
          updated++;
        }
      } catch (error: any) {
        console.error(`❌ Error importing sponsor "${sponsor.companyName}":`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Import completed!');
    console.log(`   Imported: ${imported} new records`);
    console.log(`   Updated: ${updated} existing records`);
    console.log(`   Errors: ${errors}`);

    // Mark expired sponsors as inactive
    console.log('\n🧹 Cleaning up expired sponsors...');
    const expiredResult = await UKSponsor.updateMany(
      {
        expiryDate: { $lt: new Date() },
        status: 'Active'
      },
      {
        $set: { status: 'Expired' }
      }
    );
    console.log(`✅ Marked ${expiredResult.modifiedCount} expired sponsors as inactive`);

    return {
      imported,
      updated,
      errors,
      expiredMarked: expiredResult.modifiedCount
    };
  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run import if script is executed directly
if (require.main === module) {
  importUKSponsors()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { importUKSponsors };


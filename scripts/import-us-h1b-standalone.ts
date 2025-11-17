/**
 * US H-1B Employer Import Script (Standalone)
 * 
 * This is a standalone version that doesn't require server-only modules
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import USH1BEmployer from '../src/models/USH1BEmployer';
import { normalizeCompanyName } from '../src/lib/utils/company-name-normalizer';

/**
 * Parses US H-1B employer data
 */
function parseUSH1BData(data: string, format: 'csv' | 'json' = 'csv'): Array<{
  employerName: string;
  fein?: string;
  lastFiledYear?: number;
}> {
  const employers: Array<{
    employerName: string;
    fein?: string;
    lastFiledYear?: number;
  }> = [];

  if (format === 'json') {
    const jsonData = JSON.parse(data);
    if (Array.isArray(jsonData)) {
      jsonData.forEach((record: any) => {
        if (record.employer_name || record.employerName || record.employer) {
          employers.push({
            employerName: record.employer_name || record.employerName || record.employer,
            fein: record.fein || record.federal_employer_id,
            lastFiledYear: record.year || record.filed_year || new Date().getFullYear()
          });
        }
      });
    }
  } else {
    const lines = data.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or invalid');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV with quoted fields
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

        if (header.includes('employer') || header.includes('company') || header.includes('employer_name')) {
          record.employerName = value;
        } else if (header.includes('fein') || header.includes('ein') || header.includes('employer_tax_id')) {
          record.fein = value;
        } else if (header.includes('year') || header.includes('filed') || header.includes('fiscal_year')) {
          const year = parseInt(value);
          if (!isNaN(year) && year > 2000 && year < 2100) {
            record.lastFiledYear = year;
          }
        }
      });

      if (record.employerName) {
        employers.push({
          employerName: record.employerName,
          fein: record.fein,
          lastFiledYear: record.lastFiledYear || new Date().getFullYear()
        });
      }
    }
  }

  return employers;
}

/**
 * Imports US H-1B employers into database
 */
async function importUSH1BEmployers() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  const dataUrl = process.env.US_H1B_DATA_URL;
  if (!dataUrl) {
    throw new Error('US_H1B_DATA_URL environment variable is required');
  }

  const dataFormat = (process.env.US_H1B_DATA_FORMAT || 'csv') as 'csv' | 'json';

  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Database connected');

    console.log('📥 Downloading US H-1B employer data...');
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`Failed to download data: ${response.status} ${response.statusText}`);
    }
    const data = await response.text();
    console.log(`✅ Downloaded ${data.length} bytes of data`);

    console.log('📊 Parsing data...');
    const employers = parseUSH1BData(data, dataFormat);
    console.log(`✅ Parsed ${employers.length} employer records`);

    console.log('💾 Importing employers into database...');
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const employer of employers) {
      try {
        const normalized = normalizeCompanyName(employer.employerName);

        const result = await USH1BEmployer.findOneAndUpdate(
          {
            normalizedName: normalized,
            ...(employer.fein ? { fein: employer.fein } : {})
          },
          {
            employerName: employer.employerName,
            normalizedName: normalized,
            fein: employer.fein,
            lastFiledYear: employer.lastFiledYear || new Date().getFullYear(),
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
        console.error(`❌ Error importing employer "${employer.employerName}":`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Import completed!');
    console.log(`   Imported: ${imported} new records`);
    console.log(`   Updated: ${updated} existing records`);
    console.log(`   Errors: ${errors}`);

    // Clean up old records (remove employers that haven't filed in 5+ years)
    console.log('\n🧹 Cleaning up old employer records...');
    const cutoffYear = new Date().getFullYear() - 5;
    const deleteResult = await USH1BEmployer.deleteMany({
      lastFiledYear: { $lt: cutoffYear }
    });
    console.log(`✅ Removed ${deleteResult.deletedCount} employers that haven't filed since ${cutoffYear}`);

    return {
      imported,
      updated,
      errors,
      deleted: deleteResult.deletedCount
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
  importUSH1BEmployers()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { importUSH1BEmployers };


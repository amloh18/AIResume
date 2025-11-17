/**
 * Sponsorship Registry Service
 * 
 * Service layer for importing and managing sponsorship registry data.
 * This wraps the import scripts to make them callable from API routes.
 */

import mongoose from 'mongoose';
import { getConnection } from '@/lib/database';
import UKSponsor from '@/models/UKSponsor';
import USH1BEmployer from '@/models/USH1BEmployer';
import { normalizeCompanyName } from '@/lib/utils/company-name-normalizer';

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

    const values = line.split(',').map(v => v.trim());
    const record: any = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      if (header.includes('company') || header.includes('name') || header.includes('organisation')) {
        record.companyName = value;
      } else if (header.includes('licence') || header.includes('license')) {
        record.licenceNumber = value;
      } else if (header.includes('status')) {
        record.status = value || 'Active';
      } else if (header.includes('expiry') || header.includes('expire')) {
        if (value) {
          record.expiryDate = new Date(value);
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
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const record: any = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';

        if (header.includes('employer') || header.includes('company')) {
          record.employerName = value;
        } else if (header.includes('fein') || header.includes('ein')) {
          record.fein = value;
        } else if (header.includes('year') || header.includes('filed')) {
          record.lastFiledYear = parseInt(value) || new Date().getFullYear();
        }
      });

      if (record.employerName) {
        employers.push({
          employerName: record.employerName,
          fein: record.fein,
          lastFiledYear: record.lastFiledYear
        });
      }
    }
  }

  return employers;
}

/**
 * Imports UK sponsors into database
 */
export async function importUKSponsors(): Promise<{
  imported: number;
  updated: number;
  errors: number;
  expiredMarked: number;
}> {
  await getConnection();

  const csvUrl = process.env.UK_SPONSOR_REGISTRY_URL;
  if (!csvUrl) {
    throw new Error('UK_SPONSOR_REGISTRY_URL environment variable not set');
  }

  const csvData = await downloadCSV(csvUrl);
  const sponsors = parseUKSponsorCSV(csvData);

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
      console.error(`Error importing sponsor "${sponsor.companyName}":`, error.message);
      errors++;
    }
  }

  // Mark expired sponsors as inactive
  const expiredResult = await UKSponsor.updateMany(
    {
      expiryDate: { $lt: new Date() },
      status: 'Active'
    },
    {
      $set: { status: 'Expired' }
    }
  );

  return {
    imported,
    updated,
    errors,
    expiredMarked: expiredResult.modifiedCount
  };
}

/**
 * Imports US H-1B employers into database
 */
export async function importUSH1BEmployers(): Promise<{
  imported: number;
  updated: number;
  errors: number;
  deleted: number;
}> {
  await getConnection();

  const dataUrl = process.env.US_H1B_DATA_URL;
  if (!dataUrl) {
    throw new Error('US_H1B_DATA_URL environment variable not set');
  }

  const dataFormat = (process.env.US_H1B_DATA_FORMAT || 'csv') as 'csv' | 'json';
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Failed to download data: ${response.status} ${response.statusText}`);
  }
  const data = await response.text();

  const employers = parseUSH1BData(data, dataFormat);

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
      console.error(`Error importing employer "${employer.employerName}":`, error.message);
      errors++;
    }
  }

  // Clean up old records (remove employers that haven't filed in 5+ years)
  const cutoffYear = new Date().getFullYear() - 5;
  const deleteResult = await USH1BEmployer.deleteMany({
    lastFiledYear: { $lt: cutoffYear }
  });

  return {
    imported,
    updated,
    errors,
    deleted: deleteResult.deletedCount
  };
}




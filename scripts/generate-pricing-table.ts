/**
 * Script to generate pricing table with region, country, plan code, plan with price, and pay type
 * UPDATED: Now fetches pricing from database instead of hardcoded values
 * Run with: npx tsx scripts/generate-pricing-table.ts
 */

import { getConnection } from '../src/lib/database/connection-manager';
import PriceRegion from '../src/models/PriceRegion';
import CountryMapping from '../src/models/CountryMapping';

interface PricingTableRow {
  region: string;
  country: string;
  planCode: string;
  planWithPrice: string;
  payType: string;
}

const PLAN_CONFIG = [
  {
    code: 'day_pass',
    name: 'Day Pass',
    priceKey: 'dayPass' as const,
    payType: 'One-time'
  },
  {
    code: 'pro_monthly',
    name: 'Pro Monthly',
    priceKey: 'monthly' as const,
    payType: 'Monthly'
  },
  {
    code: 'pro_quarterly',
    name: 'Pro Quarterly',
    priceKey: 'quarterly' as const,
    payType: 'Quarterly'
  },
  {
    code: 'pro_yearly',
    name: 'Pro Yearly',
    priceKey: 'yearly' as const,
    payType: 'Yearly'
  }
];

async function generatePricingTable(): Promise<PricingTableRow[]> {
  const table: PricingTableRow[] = [];

  try {
    // Connect to database
    await getConnection();

    // Fetch all price regions and country mappings
    const priceRegions = await PriceRegion.find({});
    const countryMappings = await CountryMapping.find({});

    // Build region map for quick lookup
    const regionMap = new Map();
    priceRegions.forEach(region => {
      regionMap.set(region.regionId, region);
    });

    // Iterate through all country mappings
    for (const mapping of countryMappings) {
      const region = regionMap.get(mapping.regionId);
      if (!region) continue;

      // For each plan type
      for (const plan of PLAN_CONFIG) {
        let price: number;
        switch (plan.priceKey) {
          case 'dayPass':
            price = region.plans.dayPass;
            break;
          case 'monthly':
            price = region.plans.monthly;
            break;
          case 'quarterly':
            price = region.plans.quarterly;
            break;
          case 'yearly':
            price = region.plans.yearly;
            break;
          default:
            price = 0;
        }

        const priceString = `${region.currencySymbol}${price}`;
        
        table.push({
          region: mapping.countryCode,
          country: getCountryName(mapping.countryCode),
          planCode: plan.code,
          planWithPrice: `${plan.name} - ${priceString}`,
          payType: plan.payType
        });
      }
    }

    return table;
  } catch (error) {
    console.error('Error generating pricing table:', error);
    throw error;
  }
}

// Helper function to get country name from code
function getCountryName(code: string): string {
  const names: Record<string, string> = {
    'GB': 'United Kingdom', 'US': 'United States', 'CA': 'Canada', 
    'AU': 'Australia', 'DE': 'Germany', 'FR': 'France', 
    'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
    'BE': 'Belgium', 'AT': 'Austria', 'FI': 'Finland', 
    'IE': 'Ireland', 'PT': 'Portugal', 'GR': 'Greece', 
    'PL': 'Poland', 'IN': 'India', 'PK': 'Pakistan',
  };
  return names[code] || code;
}

function formatAsMarkdownTable(rows: PricingTableRow[]): string {
  let markdown = '| Region | Country | Plan Code | Plan with Price | Pay Type |\n';
  markdown += '|--------|---------|-----------|-----------------|----------|\n';

  for (const row of rows) {
    markdown += `| ${row.region} | ${row.country} | ${row.planCode} | ${row.planWithPrice} | ${row.payType} |\n`;
  }

  return markdown;
}

function formatAsCSV(rows: PricingTableRow[]): string {
  let csv = 'Region,Country,Plan Code,Plan with Price,Pay Type\n';

  for (const row of rows) {
    csv += `${row.region},${row.country},${row.planCode},"${row.planWithPrice}",${row.payType}\n`;
  }

  return csv;
}

function formatAsJSON(rows: PricingTableRow[]): string {
  return JSON.stringify(rows, null, 2);
}

// Main execution
if (require.main === module) {
  generatePricingTable().then(table => {

  console.log('=== Pricing Table ===\n');
  console.log(`Total rows: ${table.length}\n`);

  // Output formats
  const format = process.argv[2] || 'markdown';

  switch (format) {
    case 'csv':
      console.log(formatAsCSV(table));
      break;
    case 'json':
      console.log(formatAsJSON(table));
      break;
    case 'markdown':
    default:
      console.log(formatAsMarkdownTable(table));
      break;
  }

  // Summary statistics
  const regions = new Set(table.map(row => row.region));
  const countries = new Set(table.map(row => row.country));
  const planCodes = new Set(table.map(row => row.planCode));
  const payTypes = new Set(table.map(row => row.payType));

  console.log('\n=== Summary ===');
  console.log(`Total Regions: ${regions.size}`);
  console.log(`Total Countries: ${countries.size}`);
  console.log(`Total Plan Codes: ${planCodes.size}`);
  console.log(`Total Pay Types: ${payTypes.size}`);
  console.log(`\nRegions: ${Array.from(regions).sort().join(', ')}`);
  console.log(`Plan Codes: ${Array.from(planCodes).sort().join(', ')}`);
  console.log(`Pay Types: ${Array.from(payTypes).sort().join(', ')}`);
  
  process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { generatePricingTable, formatAsMarkdownTable, formatAsCSV, formatAsJSON };


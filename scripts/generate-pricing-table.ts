/**
 * Script to generate pricing table with region, country, plan code, plan with price, and pay type
 * Run with: npx tsx scripts/generate-pricing-table.ts
 */

import { REGIONAL_PRICING } from '../src/lib/pricing/regionalPricing';

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

function generatePricingTable(): PricingTableRow[] {
  const table: PricingTableRow[] = [];

  // Iterate through all regions
  for (const [regionCode, pricing] of Object.entries(REGIONAL_PRICING)) {
    // For each plan type
    for (const plan of PLAN_CONFIG) {
      const price = pricing[plan.priceKey];
      table.push({
        region: regionCode,
        country: pricing.country,
        planCode: plan.code,
        planWithPrice: `${plan.name} - ${price}`,
        payType: plan.payType
      });
    }
  }

  return table;
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
  const table = generatePricingTable();

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
}

export { generatePricingTable, formatAsMarkdownTable, formatAsCSV, formatAsJSON };


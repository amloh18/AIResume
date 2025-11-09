# Database Pricing Migration Guide

## Overview

The pricing system has been migrated from hardcoded constants to a database-driven approach using MongoDB collections. This provides better scalability, maintainability, and allows dynamic pricing updates without code deployments.

## Database Schema

### 1. PriceRegions Collection

Stores unique price sets that can be shared across multiple countries.

**Schema:**
```typescript
{
  regionId: string;        // Unique identifier (e.g., "GBP_DEFAULT", "EUR_1", "INR_1")
  isDefault: boolean;      // Only one region can be default (fallback)
  currency: string;       // Currency code (GBP, USD, EUR, INR, etc.)
  currencySymbol: string; // Currency symbol (£, $, €, ₹, etc.)
  plans: {
    dayPass: number;      // Numeric price (e.g., 1.99)
    monthly: number;       // Numeric price (e.g., 9.99)
    quarterly: number;    // Numeric price (e.g., 24.99)
    yearly: number;        // Numeric price (e.g., 89.99)
  }
}
```

**Example:**
```json
{
  "regionId": "INR_1",
  "isDefault": false,
  "currency": "INR",
  "currencySymbol": "₹",
  "plans": {
    "dayPass": 49,
    "monthly": 199,
    "quarterly": 549,
    "yearly": 1999
  }
}
```

### 2. CountryMappings Collection

Maps country codes to price region IDs. This allows multiple countries to share the same pricing (e.g., all EU countries use EUR_1).

**Schema:**
```typescript
{
  countryCode: string;  // ISO country code (GB, US, IN, etc.)
  regionId: string;     // Reference to PriceRegion.regionId
}
```

**Example:**
```json
{ "countryCode": "IN", "regionId": "INR_1" }
{ "countryCode": "US", "regionId": "USD_1" }
{ "countryCode": "DE", "regionId": "EUR_1" }
{ "countryCode": "FR", "regionId": "EUR_1" }
```

## Migration Steps

### Step 1: Run the Migration Script

```bash
# Using ts-node
npx ts-node scripts/migrate-pricing-to-database.ts

# Or using tsx
npx tsx scripts/migrate-pricing-to-database.ts
```

This script will:
- Create 7 PriceRegions (GBP_DEFAULT, USD_1, CAD_AUD_1, EUR_1, PLN_1, INR_1, PKR_1)
- Create CountryMappings for all countries
- Map all 27 EU countries to EUR_1
- Set GBP_DEFAULT as the default fallback region

### Step 2: Verify Migration

Check that the collections were created:

```javascript
// In MongoDB shell or Compass
db.priceregions.find().pretty()
db.countrymappings.find().pretty()
```

You should see:
- 7 documents in `priceregions` collection
- ~30+ documents in `countrymappings` collection

## How It Works

### Price Lookup Flow

1. **User visits site** → System detects country code from IP (e.g., "IN")
2. **Query CountryMappings** → Find mapping for "IN" → Returns `{ countryCode: "IN", regionId: "INR_1" }`
3. **Query PriceRegions** → Find region with `regionId: "INR_1"` → Returns pricing data
4. **Use pricing** → Extract prices: `monthly: 199, quarterly: 549, yearly: 1999`

### Fallback Logic

If a country code is not found in CountryMappings:
- System queries PriceRegions for `isDefault: true`
- Uses default pricing (GBP_DEFAULT)

## Updated Components

### ✅ Checkout API (`/api/checkout/session`)
- Now uses `getRegionalPricingFromDB()` instead of `REGIONAL_PRICING` constant
- Fetches pricing from database based on user location
- Uses correct currency and full prices for quarterly/yearly

### ✅ Pricing Hooks (`usePricingPlans`)
- Fetches regional pricing from `/api/pricing/regional` endpoint
- Endpoint queries database for pricing
- Maintains backward compatibility with existing components

### ✅ Admin Panel (`PricingPlanManager`)
- Displays pricing from database
- Shows all price regions and country mappings
- Can filter by currency

### ✅ Pricing Plans API (`/api/pricing-plans`)
- Uses database pricing for all plan calculations
- Returns regional pricing info in response

## API Endpoints

### Get Regional Pricing
```
GET /api/pricing/regional?countryCode=IN
```
Returns pricing for a specific country, or default if not found.

### Admin: Manage Price Regions
```
GET    /api/admin/pricing-regions        # List all regions
POST   /api/admin/pricing-regions        # Create/update region
PUT    /api/admin/pricing-regions        # Update region
DELETE /api/admin/pricing-regions?regionId=XXX  # Delete region
```

### Admin: Manage Country Mappings
```
GET    /api/admin/country-mappings      # List all mappings
POST   /api/admin/country-mappings      # Create/update mapping
DELETE /api/admin/country-mappings?countryCode=XX  # Delete mapping
```

## Benefits

1. **Scalability**: Easy to add new countries/regions without code changes
2. **Maintainability**: Update prices for all EU countries by changing one region
3. **Flexibility**: Share pricing across countries (e.g., CA and AU use same pricing)
4. **Performance**: Cached queries with 5-minute TTL
5. **Admin Control**: Admins can update pricing through API without deployments

## Price Update Example

To update pricing for all EU countries:

```javascript
// Update EUR_1 region
PUT /api/admin/pricing-regions
{
  "regionId": "EUR_1",
  "currency": "EUR",
  "currencySymbol": "€",
  "plans": {
    "dayPass": 2.99,    // Updated from 2.49
    "monthly": 12.99,   // Updated from 11.99
    "quarterly": 29.99, // Updated from 29.99
    "yearly": 109.99    // Updated from 109.99
  }
}
```

All 27 EU countries will automatically use the new pricing!

## Notes

- The old `REGIONAL_PRICING` constant in `regionalPricing.ts` is kept for reference but no longer used
- All pricing is now fetched from database
- Caching is implemented to minimize database queries (5-minute TTL)
- Default fallback ensures system always has pricing available


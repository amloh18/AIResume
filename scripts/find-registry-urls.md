# Finding Registry URLs Guide

This guide helps you find the direct CSV download URLs for the sponsorship registries.

## UK Sponsor Registry URL

### Steps to Find the URL:

1. **Visit the UK Government Page:**
   - Go to: https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers

2. **Find the CSV Download:**
   - Scroll down to find the "Documents" or "Attachments" section
   - Look for a CSV file link (usually named something like "register-of-licensed-sponsors-workers.csv")
   - Right-click the link and select "Copy link address"

3. **URL Pattern:**
   - The URL typically looks like:
     ```
     https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/[NUMBER]/register-of-licensed-sponsors-workers.csv
     ```

4. **Update Frequency:**
   - The registry is updated regularly (weekly/monthly)
   - The URL changes when a new version is published
   - You may need to update `UK_SPONSOR_REGISTRY_URL` periodically

### Alternative Method (Using Browser DevTools):

1. Open the page in your browser
2. Open Developer Tools (F12)
3. Go to the Network tab
4. Click the CSV download link on the page
5. Find the CSV request in the Network tab
6. Copy the Request URL

## US H-1B Employer Data URL

### Option 1: USCIS H-1B Employer Data Hub

1. **Visit the USCIS Page:**
   - Go to: https://www.uscis.gov/tools/reports-and-studies/h-1b-employer-data-hub/h-1b-employer-data-hub-files

2. **Select Fiscal Year:**
   - Choose the most recent fiscal year (e.g., FY 2024)
   - Click on the CSV download link

3. **Get Direct URL:**
   - Right-click the CSV download link
   - Select "Copy link address"
   - This is your `US_H1B_DATA_URL`

### Option 2: Department of Labor (DOL)

1. **Visit the DOL Page:**
   - Go to: https://www.dol.gov/agencies/eta/foreign-labor/performance

2. **Find H-1B Data:**
   - Look for H-1B disclosure data or employer data sections
   - Download the CSV file for the most recent year

3. **Upload to Your Own Storage (Recommended):**
   - Since DOL URLs may change, consider:
     - Downloading the CSV file
     - Uploading it to your S3 bucket or CDN
     - Using that stable URL as `US_H1B_DATA_URL`

### URL Pattern Examples:

- USCIS: `https://www.uscis.gov/sites/default/files/document/data/[filename].csv`
- DOL: `https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/[filename].csv`

## Testing the URLs

Once you have the URLs, test them:

```bash
# Test UK URL
curl -I "YOUR_UK_SPONSOR_REGISTRY_URL"

# Test US URL
curl -I "YOUR_US_H1B_DATA_URL"
```

Both should return `200 OK` and `Content-Type: text/csv` or similar.

## Setting Environment Variables

After finding the URLs:

1. **Local Development (.env.local):**
   ```bash
   UK_SPONSOR_REGISTRY_URL=https://assets.publishing.service.gov.uk/.../register.csv
   US_H1B_DATA_URL=https://www.uscis.gov/.../h1b-data.csv
   ```

2. **Production (Vercel):**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add the variables there

## Automation Tip

Since these URLs change, you might want to:

1. **Set up monitoring** to detect when URLs change
2. **Use a stable proxy URL** that you control (download from source, host on your S3/CDN)
3. **Create a script** that checks for URL updates and notifies you

## Current Status

- ✅ CRON_SECRET: Generated and set
- ⏳ UK_SPONSOR_REGISTRY_URL: Needs to be found and set
- ⏳ US_H1B_DATA_URL: Needs to be found and set

Once both URLs are set, you can run:
```bash
npm run import:uk-sponsors
npm run import:us-h1b
```



# AWS Account Migration Guide: Morigrid Labs

## Overview

This guide documents the migration from the previous AWS account to **Morigrid Labs** (Account ID: `9129-3585-4507`) in the `eu-north-1` (Stockholm) region.

## What Changed

### Environment Variables

| Variable | Old Value | New Value |
|----------|-----------|-----------|
| `AWS_ACCOUNT_ID` | *(not set)* | `9129-3585-4507` |
| `AWS_ACCESS_KEY_ID` | `AKIAT734A6OY43GMNBUK` | *Set in new account IAM* |
| `AWS_SECRET_ACCESS_KEY` | `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` | *Set in new account IAM* |
| `AWS_S3_REGION` | `eu-north-1` | `eu-north-1` |
| `AWS_S3_BUCKET_NAME` | `cvcircle` | `cvcircle` (or new bucket) |
| `DYNAMODB_TABLE_NAME` | `CVCircleSingleTable` | `CVCircleSingleTable` |
| `USE_DYNAMODB_ONLY` | `true` | `true` |

### Code Changes

- `src/lib/s3-client.ts` — Added `AWS_ACCOUNT_ID` support, improved error messages
- `src/lib/dynamodb.ts` — Added `AWS_ACCOUNT_ID` and `AWS_REGION` fallbacks
- `src/lib/database/connection-manager.ts` — Logs Morigrid Labs account info on DynamoDB connect
- `scripts/migrate-to-dynamodb.ts` — Updated with account info and next steps
- `env.example` — Updated with new account documentation
- `.env.local` — Updated with placeholders for new credentials

## Prerequisites

Before running the migration or deploying to production:

1. **Create IAM User in Morigrid Labs Account**
   - Go to AWS Console → IAM → Users → Create user
   - Attach policies:
     - `AmazonS3FullAccess` (or custom policy for `cvcircle` bucket)
     - `AmazonDynamoDBFullAccess` (or custom policy for `CVCircleSingleTable` table)
   - Generate Access Key ID and Secret Access Key

2. **Create S3 Bucket**
   - Go to AWS Console → S3 → Create bucket
   - Name: `cvcircle`
   - Region: `eu-north-1` (Stockholm)
   - Enable versioning and encryption

3. **Create DynamoDB Table**
   - Go to AWS Console → DynamoDB → Create table
   - Table name: `CVCircleSingleTable`
   - Partition key: `PK` (String)
   - Sort key: `SK` (String)
   - Enable TTL for `expiresAt` attribute (90 days)
   - Region: `eu-north-1`

## Local Development Setup

1. Update `.env.local` with your new IAM credentials:

```bash
AWS_ACCOUNT_ID="9129-3585-4507"
AWS_ACCESS_KEY_ID="YOUR_NEW_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="YOUR_NEW_SECRET_ACCESS_KEY"
AWS_S3_BUCKET_NAME="cvcircle"
AWS_S3_REGION="eu-north-1"
AWS_REGION="eu-north-1"
DYNAMODB_TABLE_NAME="CVCircleSingleTable"
USE_DYNAMODB_ONLY="true"
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## MongoDB → DynamoDB Migration

### Step 1: Verify MongoDB Connection

Ensure your `MONGODB_URI` is set in `.env.local`:

```bash
MONGODB_URI="mongodb+srv://username:password@cluster0.ta7jxv7.mongodb.net/cvcircle?retryWrites=true&w=majority"
```

### Step 2: Run Migration

```bash
npx tsx scripts/migrate-to-dynamodb.ts
```

Or if you have a script defined in `package.json`:

```bash
npm run migrate:to-dynamodb
```

### Step 3: Verify Migration

Check AWS Console:
1. Go to DynamoDB → Tables → `CVCircleSingleTable`
2. Verify items are present
3. Go to S3 → Buckets → `cvcircle`
4. Verify objects are present

## Production Deployment (Vercel)

### Step 1: Set Environment Variables in Vercel

Go to Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# AWS Configuration (Morigrid Labs)
AWS_ACCOUNT_ID=9129-3585-4507
AWS_ACCESS_KEY_ID=your-production-access-key-id
AWS_SECRET_ACCESS_KEY=your-production-secret-access-key
AWS_S3_BUCKET_NAME=cvcircle
AWS_S3_REGION=eu-north-1
AWS_REGION=eu-north-1
DYNAMODB_TABLE_NAME=CVCircleSingleTable
USE_DYNAMODB_ONLY=true

# Database (if still using MongoDB for any features)
MONGODB_URI=your-mongodb-connection-string

# Other required variables...
NEXTAUTH_URL=https://buildairesume.com
NEXTAUTH_SECRET=your-nextauth-secret
JWT_SECRET=your-jwt-secret
# ... etc
```

### Step 2: Redeploy

```bash
vercel --prod
```

Or trigger a redeploy from the Vercel dashboard.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AIResume Application                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Next.js    │    │   DynamoDB   │    │     S3       │  │
│  │   (Vercel)   │───▶│  (Primary)   │    │  (Files)     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   MongoDB    │    │   (Legacy)   │    │   (Legacy)   │  │
│  │  (Optional)  │    │              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
│  AWS Account: Morigrid Labs (9129-3585-4507)                 │
│  Region: eu-north-1 (Stockholm)                              │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### "Missing required S3 environment variables"
- Ensure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_REGION`, and `AWS_S3_BUCKET_NAME` are set in `.env.local`

### "MongoDB connection failed"
- Ensure `MONGODB_URI` is set for migration scripts
- Check MongoDB Atlas network access allows your IP

### "DynamoDB table not found"
- Ensure `CVCircleSingleTable` table exists in `eu-north-1`
- Verify IAM user has `dynamodb:*` permissions

### "S3 bucket access denied"
- Ensure IAM user has `s3:*` permissions on `cvcircle` bucket
- Check bucket policy allows access from your IP/VPC

## Security Notes

- Never commit `.env.local` to version control
- Use IAM roles instead of access keys in production when possible
- Rotate credentials regularly
- Enable MFA on IAM users
- Use AWS Secrets Manager for production credentials

## Support

For issues with:
- AWS Infrastructure: Check AWS Console → CloudWatch → Logs
- Application: Check Vercel Dashboard → Logs
- Database: Check DynamoDB Console → Metrics

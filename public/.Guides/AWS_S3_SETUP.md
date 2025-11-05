# AWS S3 Setup Guide

This guide walks you through setting up AWS S3 bucket with selective public access for CV Circle landing assets.

## Prerequisites

- AWS Account with S3 access
- AWS CLI installed (optional, but recommended)
- Bucket name: `cvcircle` (or your preferred name)
- Region: `eu-north-1` (or your preferred region)

## Step 1: Create S3 Bucket (if not already created)

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click **Create bucket**
3. Configure:
   - **Bucket name**: `cvcircle`
   - **Region**: `eu-north-1`
   - **Block Public Access**: Keep ON (we'll allow specific paths via bucket policy)
   - **Versioning**: Optional (recommended for production)
   - **Default encryption**: Enable (SSE-S3 or SSE-KMS)
4. Click **Create bucket**

## Step 2: Configure Bucket Policy

1. Select your bucket (`cvcircle`)
2. Go to **Permissions** tab
3. Scroll to **Bucket policy**
4. Click **Edit**
5. Copy the policy from `docs/S3_BUCKET_POLICY.md`
6. Replace `cvcircle` with your bucket name if different
7. Click **Save changes**

The policy allows public read access to:
- `landing-assets/*` - Marketing images, hero banner
- `thumbnails/templates/*` - Template preview thumbnails

All other paths remain private.

## Step 3: Configure CORS

1. In your bucket, go to **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit**
4. Paste the following CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://cvcircle.io",
      "https://www.cvcircle.io",
      "https://app.cvcircle.io",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3000
  }
]
```

5. Click **Save changes**

## Step 4: Configure Block Public Access

1. In **Permissions** tab, find **Block public access (bucket settings)**
2. Click **Edit**
3. Keep **Block all public access** checked
4. The bucket policy will override this for specific paths
5. Click **Save changes**

> **Note**: Despite "Block all public access" being ON, the bucket policy allows specific paths to be public. This is the recommended security approach.

## Step 5: Set Up Environment Variables

Add these to your `.env.local` file:

```bash
# AWS S3 Configuration
AWS_S3_BUCKET_NAME=cvcircle
AWS_S3_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Optional: S3 URLs for landing assets (set after uploading)
NEXT_PUBLIC_HERO_BANNER_S3_URL=https://cvcircle.s3.eu-north-1.amazonaws.com/landing-assets/herobanner.png
NEXT_PUBLIC_S3_BASE_URL=https://cvcircle.s3.eu-north-1.amazonaws.com/landing-assets/cv-templates
```

### Creating AWS Access Keys

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → Your user or create new user
3. Go to **Security credentials** tab
4. Click **Create access key**
5. Choose **Application running outside AWS**
6. Download or copy the keys
7. Add to your `.env.local` file

> **Security Best Practice**: Create a dedicated IAM user with minimal S3 permissions (PutObject, GetObject, DeleteObject) rather than using root account keys.

### IAM Policy for S3 Access

Create an IAM policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::cvcircle/*",
        "arn:aws:s3:::cvcircle"
      ]
    }
  ]
}
```

## Step 6: Upload Landing Assets

Run the upload script to upload landing assets to S3:

```bash
npx ts-node scripts/upload-landing-assets-to-s3.ts
```

Or if you have tsx installed:

```bash
npx tsx scripts/upload-landing-assets-to-s3.ts
```

The script will:
- Upload `public/images/herobanner.png` → `landing-assets/herobanner.png`
- Upload `public/CV templates/*.png` → `landing-assets/templates/*.png` (matches `/templates/` naming convention)
- Upload `public/templates/*.png` → `landing-assets/templates/*.png` (for hardcoded templates)
- Print public URLs for each uploaded file
- Provide environment variable values to add

After running the script, update your `.env.local` with the URLs provided.

## Step 7: Verify Public Access

Test that public assets are accessible:

```bash
# Should work (public)
curl https://cvcircle.s3.eu-north-1.amazonaws.com/landing-assets/herobanner.png

# Should fail with 403 (private)
curl https://cvcircle.s3.eu-north-1.amazonaws.com/thumbnails/user123/cv-123.png
```

## Step 8: Deploy to Vercel

Add the same environment variables to your Vercel project:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all AWS S3 variables:
   - `AWS_S3_BUCKET_NAME`
   - `AWS_S3_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `NEXT_PUBLIC_HERO_BANNER_S3_URL` (optional)
   - `NEXT_PUBLIC_S3_BASE_URL` (optional)

3. Redeploy your application

## Troubleshooting

### Images Not Loading on Vercel

1. **Check CORS**: Ensure your domain is in the CORS allowed origins
2. **Check Bucket Policy**: Verify the policy is correctly applied
3. **Check Environment Variables**: Ensure `NEXT_PUBLIC_*` variables are set in Vercel
4. **Check URL Format**: Verify S3 URLs match your bucket name and region

### 403 Forbidden Errors

- If public assets return 403, check:
  1. Bucket policy is correctly applied
  2. Block public access is configured correctly
  3. File path matches policy (`landing-assets/*` or `thumbnails/templates/*`)

### User Thumbnails Not Loading

User thumbnails are intentionally private. They use presigned URLs via `/api/files/[key]`. If they fail:
1. Check AWS credentials are correct
2. Check the `/api/files/[key]` endpoint is working
3. Verify user authentication is working

## Security Checklist

- [ ] Bucket policy only allows public access to `landing-assets/*` and `thumbnails/templates/*`
- [ ] Block public access is ON (with policy exceptions)
- [ ] CORS is configured for your domains only
- [ ] AWS access keys are stored securely (not in git)
- [ ] IAM user has minimal required permissions
- [ ] User content paths remain private
- [ ] Presigned URLs work for private content

## Next Steps

- Monitor S3 usage and costs
- Set up S3 lifecycle policies for old assets
- Consider CloudFront CDN for better performance
- Set up S3 bucket versioning for backup
- Configure S3 access logs for monitoring

## Support

For issues or questions:
1. Check AWS CloudWatch logs
2. Check browser console for CORS errors
3. Verify bucket policy syntax in AWS Policy Simulator
4. Test S3 access with AWS CLI: `aws s3 ls s3://cvcircle/landing-assets/`


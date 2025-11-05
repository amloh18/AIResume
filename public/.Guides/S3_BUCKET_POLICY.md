# S3 Bucket Policy Configuration

This document contains the bucket policy JSON for the CV Circle S3 bucket. This policy allows selective public access to landing assets and template thumbnails while keeping all user content private.

## Bucket Policy JSON

Replace `cvcircle` with your actual bucket name if different.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadLandingAssets",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cvcircle/landing-assets/*"
    },
    {
      "Sid": "PublicReadTemplateThumbnails",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cvcircle/thumbnails/templates/*"
    }
  ]
}
```

## What This Policy Does

### Public Access (Allowed)
- ✅ `landing-assets/*` - Hero banner, marketing images, static assets
  - `landing-assets/herobanner.png` - Hero banner image
  - `landing-assets/templates/*` - Template preview images (matches `/templates/` naming convention)
- ✅ `thumbnails/templates/*` - Template preview thumbnails

### Private Access (Not in Policy)
- ❌ `thumbnails/{userId}/*` - User CV thumbnails (requires authentication)
- ❌ `profile-pictures/{userId}/*` - User profile pictures (requires authentication)
- ❌ `documents/{userId}/*` - User documents (requires authentication)
- ❌ `files/{userId}/*` - User files (requires authentication)

## How to Apply This Policy

1. Go to AWS S3 Console
2. Select your bucket (`cvcircle`)
3. Go to **Permissions** tab
4. Scroll to **Bucket policy**
5. Click **Edit**
6. Paste the JSON above (replace `cvcircle` with your bucket name)
7. Click **Save changes**

## Important Security Notes

1. **Block Public Access**: Keep "Block all public access" ON, but allow the specific prefixes above via bucket policy
2. **CORS**: Configure CORS for your domain to allow image loading
3. **User Content**: All user-specific content remains private and requires presigned URLs via `/api/files/[key]`
4. **No Sensitive Data**: Only non-sensitive marketing assets are made public

## CORS Configuration

Add this CORS configuration to your bucket:

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

## Testing

After applying the policy, test public access:

```bash
# Should work (public)
curl https://cvcircle.s3.eu-north-1.amazonaws.com/landing-assets/herobanner.png

# Should fail (private)
curl https://cvcircle.s3.eu-north-1.amazonaws.com/thumbnails/user123/cv-123.png
```


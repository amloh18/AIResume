# Apple Login Setup Guide for BuildAIResume

This guide walks through configuring Apple Sign-In (Sign in with Apple) for the BuildAIResume web app.

---

## Prerequisites

- An Apple Developer account ($99/year)
- Access to the Apple Developer portal at https://developer.apple.com
- Your app's production domain (e.g., `resume.morigrid.com`)

---

## Step 1: Create an App ID

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click **+** to create a new identifier
3. Select **App IDs** then Continue
4. Select **App** then Continue
5. Fill in:
   - **Description**: `BuildAIResume`
   - **Bundle ID**: `com.buildairesume.app` (or your preferred reverse-domain)
6. Under **Capabilities**, enable **Sign in with Apple**
7. Click **Continue** then **Register**

---

## Step 2: Create a Services ID (for Web Sign-In)

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click **+** to create a new identifier
3. Select **Services IDs** then Continue
4. Fill in:
   - **Description**: `BuildAIResume Web`
   - **Identifier**: `com.buildairesume.web` (this becomes your APPLE_ID env var)
5. Enable **Sign in with Apple** then click **Configure**
6. Under **Primary App ID**, select the App ID you created in Step 1
7. Under **Web Authentication Configuration**:
   - **Domains and Subdomains**: `resume.morigrid.com`
   - **Return URLs**: `https://resume.morigrid.com/api/auth/callback/apple`
8. Click **Save** then **Continue** then **Register**

---

## Step 3: Create a Private Key (.p8 file)

1. Go to https://developer.apple.com/account/resources/authkeys/list
2. Click **+** to create a new key
3. Fill in:
   - **Key Name**: `BuildAIResume Apple Sign-In`
4. Enable **Sign in with Apple** then click **Configure**
5. Select your **App ID** from Step 1
6. Click **Save** then **Continue** then **Register**
7. **Download the .p8 file** -- you can only download it once!
8. Note the **Key ID** (10-character string, e.g., `ABC123DEFG`)

---

## Step 4: Note Your Team ID

1. Go to https://developer.apple.com/account
2. Your **Team ID** is displayed in the top-right or under Membership Details
3. It is a 10-character alphanumeric string (e.g., `ABC123DEF4`)

---

## Step 5: Set Environment Variables

Add these to your `.env.local` (or deployment environment):

```bash
# Apple Sign-In Configuration

# The Services ID from Step 2 (your web app identifier)
APPLE_ID="com.buildairesume.web"

# Your Apple Developer Team ID from Step 4
APPLE_TEAM_ID="ABC123DEF4"

# The Key ID from Step 3
APPLE_KEY_ID="ABC123DEFG"

# Option A: Path to the .p8 key file (relative to project root)
APPLE_KEY_PATH="keys/AuthKey_ABC123DEFG.p8"

# Option B: Paste the .p8 file contents directly (useful for Docker/Dokploy)
# APPLE_KEY_CONTENT="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Option C: Pre-generated client secret (valid for 6 months, then regenerate)
# APPLE_SECRET="eyJhbGciOiJFUzI1NiIs..."
```

### Storing the .p8 Key

**Option A (recommended for local dev):** Place the .p8 file in a `keys/` directory:

```bash
mkdir -p keys
mv ~/Downloads/AuthKey_ABC123DEFG.p8 keys/
```

**Option B (recommended for Docker/Dokploy):** Paste the file contents into `APPLE_KEY_CONTENT` env var. On macOS:

```bash
cat keys/AuthKey_ABC123DEFG.p8 | pbcopy
# Then paste into your .env.local as APPLE_KEY_CONTENT="..."
```

---

## Step 6: Configure NEXTAUTH_URL

Update `NEXTAUTH_URL` in `.env.local` to your production domain:

```bash
NEXTAUTH_URL="https://resume.morigrid.com"
```

Apple OAuth requires the callback URL to match exactly. The callback URL is:

```
https://resume.morigrid.com/api/auth/callback/apple
```

---

## Step 7: Deploy and Test

1. Set all environment variables in your deployment platform (Dokploy/Vercel)
2. Redeploy the application
3. Visit the sign-in page -- the Apple button should now be active (not grayed out)
4. Click "Sign in with Apple"
5. Complete the Apple authentication flow
6. Verify you are redirected back to the dashboard

---

## How It Works in Code

The Apple provider is already fully implemented in the codebase:

- **`src/lib/auth/apple-provider-secret.ts`**: Auto-generates the ES256 JWT client secret from the .p8 key. Caches the secret for the process lifetime and regenerates 7 days before expiry.
- **`src/lib/auth/unified-auth-service.ts`**: Configures `AppleProvider` with the dynamically generated client secret. Returns empty string (disabling the provider) when env vars are missing.
- **`src/components/auth/UnifiedAuthPage.tsx`**: The `signIn('apple', { callbackUrl })` call at line 766.
- **`src/components/auth/SocialAuthButtons.tsx`**: The Apple button component.

When the env vars are not set, the Apple provider silently disables itself -- the button is hidden and no errors are thrown.

---

## Troubleshooting

### Apple button not showing
- Verify `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and either `APPLE_KEY_PATH` or `APPLE_KEY_CONTENT` are set
- Check server logs for: `Apple Sign-In is not fully configured`

### "Invalid client secret" error
- The .p8 key may be corrupted or the wrong key ID
- Re-download the key from Apple Developer portal
- Ensure the key is associated with the correct Services ID

### Callback URL mismatch error
- The Return URL in Apple Developer portal must exactly match: `https://resume.morigrid.com/api/auth/callback/apple`
- No trailing slash, no extra path segments

### Apple secret expired
- Apple client secrets expire after 6 months max
- The code auto-regenerates within 7 days of expiry
- If using `APPLE_SECRET` (pre-generated), you must manually regenerate it

---

## Security Notes

- The .p8 key file must never be committed to Git
- Use `APPLE_KEY_CONTENT` env var for Docker deployments instead of mounting files
- The auto-generated client secret is cached in memory and not persisted
- Apple does not provide a refresh token for web sign-in -- the NextAuth JWT (7-day expiry) handles session management

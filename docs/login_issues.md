Here is the complete audit of all login and subscription issues with exact file locations and fixes.

1. Email + Password Login: "Invalid credentials" despite correct password
Root Cause Found: Double password hashing in password reset
File: src/app/api/auth/confirm-reset/route.ts (lines 106-113)

// Hash the new password
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(newPassword, salt);

// Update password in our database
user.password = hashedPassword;   // ← ALREADY HASHED
user.lastPasswordChange = new Date();
await user.save();                // ← triggers pre('save') hook which HASHES AGAIN
The User model has a pre('save') hook (src/models/User.ts, line 834-840) that automatically hashes the password:

userSchema.pre('save', async function (next) {
    if (this.isModified('password') && this.password) {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt); // hashes again!
    }
    ...
});
When a user resets their password via the code-based reset flow (confirm-reset/route.ts), the password is hashed twice. The stored hash becomes bcrypt(bcrypt(plaintext)). On login, bcrypt.compare(plaintext, doubleHashed) returns false.

The legacy token-based reset (reset-password/route.ts) does NOT have this bug because it sets user.password = password (plain text) and relies on the hook.

Fix
In src/app/api/auth/confirm-reset/route.ts, remove the manual hashing:

// BEFORE (buggy):
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(newPassword, salt);
user.password = hashedPassword;

// AFTER (correct):
user.password = newPassword;  // let pre('save') hook hash it once
Any user who reset their password via the code-based flow will need their password reset again after this fix.

2. 4-Digit OTP Login Not Working
Root Causes
A. send-code, verify-and-signin, and passwordless provider ignore AdminAuth collection

src/app/api/auth/send-code/route.ts (line 48): only checks User.findOne({ email })
src/app/api/auth/verify-and-signin/route.ts (line 129): only checks User.findOne({ email })
src/lib/auth/unified-auth-service.ts passwordless provider (line 206): only checks User.findOne({ email })
If an admin account exists only in AdminAuth (not duplicated in User), OTP login returns "No account found" or creates a duplicate regular user.

B. Fallback path in UnifiedAuthPage.tsx does not create a NextAuth session

In src/components/auth/UnifiedAuthPage.tsx (lines 446-468), when signIn('passwordless') fails, the fallback calls /api/auth/verify-and-signin. That API verifies the code and updates the user but never creates a NextAuth session cookie. The user sees: "Code was verified but sign-in failed."

C. 30-second timeout is too aggressive

In src/components/auth/UnifiedAuthPage.tsx (line 427-429):

new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Sign-in request timed out after 30 seconds')), 30000)
)
Any slow network or server delay causes a false timeout failure.

Fixes
Add AdminAuth fallback to send-code, verify-and-signin, and the passwordless provider. Example for passwordless provider:
let user = await User.findOne({ email: credentials.email.toLowerCase() }).lean().exec();
if (!user) {
    const AdminAuth = (await import('@/models/AdminAuth')).default;
    user = await AdminAuth.findOne({ email: credentials.email.toLowerCase() }).lean().exec();
    if (user) {
        // map AdminAuth fields to expected shape
    }
}
Increase timeout to 60s or remove the artificial timeout and let NextAuth handle it.
Make the fallback create a session — call /api/auth/create-session after verify-and-signin succeeds, similar to the 2FA flow (lines 387-410).
3. Admin Superuser Cannot Login / Admin Portal Icon Missing
Root Causes
A. UserService.authenticateUser checks User collection BEFORE AdminAuth

In src/lib/auth/user-service.ts (lines 41-53):

let user = await userRepository.findByEmailWithPassword(email);
let isAdminCollection = false;

if (!user) {
    // Fallback: Check AdminAuth collection
    const AdminAuth = (await import('@/models/AdminAuth')).default;
    const adminUser = await AdminAuth.findOne({ email: email.toLowerCase() })...
    if (adminUser) {
        user = adminUser as any;
        isAdminCollection = true;
    }
}
If the same email exists in both User (with role: 'user') and AdminAuth (with role: 'superadmin'), the User entry is used first. The credentials provider sees role: 'user', isAdmin: false, and either:

Rejects with 'Unauthorized. Please use the consumer login.' if portal === 'admin'
Allows login but with role: 'user', so the sidebar icon never shows
B. fetchUserData in JWT session callback has the same ordering

In src/lib/auth/unified-auth-service.ts (lines 807-825):

let userDoc = await User.findById(userId)...;
// If not found in User, check AdminAuth
if (!userDoc) {
    const AdminAuth = (await import('@/models/AdminAuth')).default;
    const adminUser = await AdminAuth.findById(userId).lean().exec();
    ...
}
If a user ID from AdminAuth happens to also exist in User, the User record wins.

C. send-code for passwordless-login rejects admin emails not in User

src/app/api/auth/send-code/route.ts (line 48):

if (type === 'passwordless-login') {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        return NextResponse.json(
            { success: false, message: 'No account found with this email. Please sign up first.' },
            { status: 404 }
        );
    }
}
Admin-only accounts in AdminAuth are rejected here.

Fixes
Reverse the lookup order in authenticateUser: check AdminAuth first, then fall back to User.
// Check AdminAuth FIRST for admin accounts
const AdminAuth = (await import('@/models/AdminAuth')).default;
const adminUser = await AdminAuth.findOne({ email: email.toLowerCase() }).select('+password').lean().exec();
if (adminUser) {
    user = adminUser as any;
    isAdminCollection = true;
} else {
    user = await userRepository.findByEmailWithPassword(email);
}
Update send-code to also check AdminAuth for passwordless-login type.
Ensure admin accounts are only in AdminAuth (or sync roles between collections). If an admin exists in both, the User entry should have role: 'superadmin'.
4. Polar Payment Works But Plan Not Updating
Root Causes
A. Most likely: Webhook not configured in Polar Dashboard

The checkout.completed event is the only thing that updates the plan in MongoDB. If the webhook URL (/api/webhooks/polar) is not registered in Polar → Settings → Webhooks, the event is never received and the plan stays on free.

B. handleSubscriptionUpdated missing one-time product IDs

In src/app/api/webhooks/polar/route.ts (lines 412-418):

if (productId) {
    pricingPlan = await PricingPlan.findOne({
        $or: [
            { 'regionalPricing.polarProductId': productId },
            { polarProductId_monthly: productId },
            { polarProductId_yearly: productId },
            { polarProductId_quarterly: productId },
            // ← MISSING: polarProductId_one_time: productId
        ]
    });
}
For one-time / lifetime plans, subscription.updated events cannot resolve the plan and only set status: 'active' without updating currentPlanKey.

C. No handler for subscription.created event

Polar may emit subscription.created separately from checkout.completed. The webhook only handles checkout.completed, checkout.expired, charge.refunded, subscription.updated, and subscription.cancelled. If Polar sends subscription.created and checkout.completed is missed, the subscription is never synced.

D. Race condition between verify endpoint and webhook

src/app/api/checkout/verify/route.ts creates the subscription synchronously on redirect. The webhook also creates it. If both fire, Subscription documents can be duplicated. The user's currentPlanKey is still updated (via $set), but duplicate subscription records clutter the DB.

Fixes
Verify webhook is configured in Polar Dashboard. The endpoint must be publicly reachable and POLAR_WEBHOOK_SECRET must be set in Vercel env vars.
Add one-time product IDs to handleSubscriptionUpdated:
{ polarProductId_one_time: productId },
{ polarPriceId_one_time: priceId },
Add subscription.created handler that mirrors checkout.completed:
case 'subscription.created':
    await handleCheckoutCompleted(event.data); // or a dedicated handler
    break;
Make createSubscription idempotent by checking for an existing active subscription for the same user + providerSubscriptionId before creating a new one.
5. Cancel Subscription — Webhooks vs Polling
Yes, webhooks are the correct approach. The webhook already handles subscription.cancelled (src/app/api/webhooks/polar/route.ts, lines 463-513):

async function handleSubscriptionCancelled(subscription: any) {
    ...
    const updateFields: any = {
        'subscription.autoRenew': false,
        'subscription.downgradeStatus': 'pending',
        'subscription.pendingDowngradePlanKey': 'free',
    };
    ...
    await User.findByIdAndUpdate(user._id, { $set: updateFields });
}
This keeps the user on their current plan until currentPeriodEnd, then schedules downgrade to free. The billing-data API also has live Polar reconciliation that will revert the plan if Polar reports canceled.

What is missing
UI button to cancel: There is no "Cancel Subscription" button in the settings/billing page. You need to add one that calls a new API route.
Cancel API route: Create src/app/api/subscription/cancel/route.ts that calls Polar's API:
const polar = getPolar();
await polar.subscriptions.cancel({
    id: providerSubscriptionId, // from user.subscription.providerSubscriptionId
});
Frontend flow: Settings page → Cancel button → confirm modal → call cancel API → show "Access continues until [date]" → Polar emits subscription.cancelled webhook → app updates DB.
Recommended implementation
User clicks "Cancel Subscription"
        │
        ▼
POST /api/subscription/cancel
        │
        ▼
Polar SDK: subscriptions.cancel({ id })
        │
        ▼
Polar emits subscription.cancelled webhook
        │
        ▼
App sets autoRenew=false, downgradeStatus='pending'
        │
        ▼
User keeps access until currentPeriodEnd
        │
        ▼
After currentPeriodEnd → user reverts to free plan
Summary of Required Code Changes
Issue	File	Change
Double-hashed passwords	src/app/api/auth/confirm-reset/route.ts Remove manual bcrypt.hash, set plaintext password
OTP ignores AdminAuth	src/app/api/auth/send-code/route.ts	Check AdminAuth before returning 404
OTP ignores AdminAuth	src/app/api/auth/verify-and-signin/route.ts	Fall back to AdminAuth if User not found
OTP ignores AdminAuth	src/lib/auth/unified-auth-service.ts	Fall back to AdminAuth in passwordless provider
Admin login uses User before AdminAuth	src/lib/auth/user-service.ts	Check AdminAuth FIRST
Admin data fetch uses User before AdminAuth	src/lib/auth/unified-auth-service.ts fetchUserData	Check AdminAuth FIRST
Missing one-time plan in webhook	src/app/api/webhooks/polar/route.ts handleSubscriptionUpdated	Add polarProductId_one_time / polarPriceId_one_time
Missing subscription.created handler	src/app/api/webhooks/polar/route.ts	Add case for subscription.created
Cancel subscription UI + API	New files needed
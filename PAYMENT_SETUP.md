# Payment System & Admin Backend Setup

This document outlines the comprehensive authentication, tier settings, admin backend, and payment integration system implemented for the CV Circle application.

## 🚀 Features Implemented

### 1. Authentication & User Management
- ✅ User authentication with NextAuth.js
- ✅ Role-based access control (User/Admin)
- ✅ User profile management
- ✅ Email verification system

### 2. Admin Backend
- ✅ **Pricing Plan Management**: Create, edit, delete subscription plans
- ✅ **Discount Code Management**: Create and manage promotional codes
- ✅ **User Management**: View, manage, and delete users with full data cleanup
- ✅ **System Health Monitoring**: Real-time system status
- ✅ **Analytics Dashboard**: KPIs and user analytics

### 3. Payment Integration
- ✅ **Stripe Integration**: Global market payments (EUR, USD)
- ✅ **Razorpay Integration**: Indian market payments (INR)
- ✅ **Multi-currency Support**: Automatic payment method selection
- ✅ **Subscription Management**: Active, cancelled, past due statuses
- ✅ **Discount Code Application**: Percentage and fixed amount discounts

### 4. Database Models
- ✅ **PricingPlan**: Subscription tiers with features
- ✅ **DiscountCode**: Promotional codes with validation
- ✅ **Subscription**: User subscription tracking
- ✅ **User**: Enhanced with subscription data

## 📋 Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# Database Configuration
MONGODB_URI=your-mongodb-connection-string-here

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Stripe Configuration (Global Market)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Razorpay Configuration (Indian Market)
RAZORPAY_KEY_ID=rzp_test_your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Other existing variables...
```

### 2. Install Dependencies

```bash
npm install stripe razorpay
```

### 3. Database Setup

The new models will be automatically created when you first run the application. However, you may want to create some initial pricing plans:

```javascript
// Example pricing plan creation via admin panel
{
  name: "Basic Plan",
  description: "Perfect for job seekers getting started",
  price: 9.99,
  currency: "EUR",
  billingCycle: "monthly",
  features: {
    maxCVs: 3,
    maxExports: 5,
    aiAssistant: true,
    coverLetterGenerator: false,
    jobTracker: false,
    communityAccess: false,
    prioritySupport: false,
    customTemplates: false,
    storageLimit: 100
  },
  isActive: true,
  isPopular: false,
  sortOrder: 1
}
```

## 🔧 API Endpoints

### Admin Endpoints

#### Pricing Plans
- `GET /api/admin/pricing-plans` - List all pricing plans
- `POST /api/admin/pricing-plans` - Create new pricing plan
- `PUT /api/admin/pricing-plans/[id]` - Update pricing plan
- `DELETE /api/admin/pricing-plans/[id]` - Delete pricing plan

#### Discount Codes
- `GET /api/admin/discount-codes` - List all discount codes
- `POST /api/admin/discount-codes` - Create new discount code
- `PUT /api/admin/discount-codes/[id]` - Update discount code
- `DELETE /api/admin/discount-codes/[id]` - Delete discount code

#### User Management
- `GET /api/admin/users` - List all users with stats
- `DELETE /api/admin/users/[id]` - Delete user and all associated data

### Payment Endpoints

#### Payment Processing
- `POST /api/payment/create-intent` - Create payment intent/order
- `POST /api/payment/confirm` - Confirm payment and create subscription

## 🎯 Usage Examples

### 1. Creating a Pricing Plan (Admin)

```javascript
const newPlan = {
  name: "Pro Plan",
  description: "Advanced features for serious job seekers",
  price: 19.99,
  currency: "EUR",
  billingCycle: "monthly",
  features: {
    maxCVs: 10,
    maxExports: 50,
    aiAssistant: true,
    coverLetterGenerator: true,
    jobTracker: true,
    communityAccess: true,
    prioritySupport: false,
    customTemplates: false,
    storageLimit: 500
  },
  isActive: true,
  isPopular: true,
  sortOrder: 2
};
```

### 2. Creating a Discount Code (Admin)

```javascript
const newDiscount = {
  code: "WELCOME20",
  description: "20% off for new users",
  discountType: "percentage",
  discountValue: 20,
  currency: "EUR",
  maxUses: 100,
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  applicablePlans: ["plan_id_1", "plan_id_2"],
  minimumOrderValue: 10,
  isActive: true
};
```

### 3. Processing a Payment (Frontend)

```javascript
// Create payment intent
const response = await fetch('/api/payment/create-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    planId: 'plan_id',
    discountCode: 'WELCOME20',
    paymentMethod: 'stripe' // or 'razorpay'
  })
});

// Confirm payment
const confirmResponse = await fetch('/api/payment/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentMethod: 'stripe',
    paymentIntentId: 'pi_xxx',
    planId: 'plan_id',
    discountCodeId: 'discount_id'
  })
});
```

## 🔐 Security Features

### 1. Admin Access Control
- Only users with `role: 'admin'` can access admin endpoints
- Session validation on all admin routes
- CSRF protection with NextAuth.js

### 2. Payment Security
- Stripe webhook signature verification
- Razorpay payment signature verification
- Secure payment intent creation
- Transaction rollback on failures

### 3. Data Protection
- User deletion includes complete data cleanup
- Subscription cancellation with audit trail
- Discount code usage tracking

## 🌍 Multi-Region Support

### Payment Method Selection
- **EUR/USD**: Automatically uses Stripe
- **INR**: Automatically uses Razorpay
- Manual override available in payment form

### Currency Support
- **EUR**: European market
- **USD**: Global market
- **INR**: Indian market

## 📊 Admin Dashboard Features

### 1. Pricing Plan Manager
- ✅ Create, edit, delete plans
- ✅ Feature configuration
- ✅ Price and currency management
- ✅ Active/inactive status
- ✅ Popular plan designation

### 2. Discount Code Manager
- ✅ Create promotional codes
- ✅ Percentage and fixed discounts
- ✅ Usage limits and tracking
- ✅ Validity periods
- ✅ Plan-specific applicability

### 3. User Management
- ✅ View all users with stats
- ✅ Delete users with complete data cleanup
- ✅ User activity tracking
- ✅ Subscription status monitoring

### 4. Analytics
- ✅ User growth metrics
- ✅ Subscription analytics
- ✅ Revenue tracking
- ✅ System health monitoring

## 🚨 Important Notes

### 1. Payment Testing
- Use Stripe test keys for development
- Use Razorpay test mode for development
- Test webhook endpoints locally with ngrok

### 2. Database Considerations
- Ensure MongoDB indexes are created for performance
- Monitor subscription collection size
- Regular cleanup of expired discount codes

### 3. Security Best Practices
- Never expose payment keys in frontend code
- Always verify webhook signatures
- Implement rate limiting on payment endpoints
- Log all payment activities for audit

## 🔄 Webhook Setup

### Stripe Webhooks
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret to environment variables

### Razorpay Webhooks
1. Go to Razorpay Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events: `payment.captured`, `payment.failed`
4. Copy webhook secret to environment variables

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Churn Rate
- Average Revenue Per User (ARPU)
- Payment Success Rate

### Admin Dashboard KPIs
- Total users and growth
- Active subscriptions
- Revenue by plan
- Discount code usage
- System performance metrics

## 🛠️ Troubleshooting

### Common Issues

1. **Payment Intent Creation Fails**
   - Check Stripe/Razorpay API keys
   - Verify plan exists and is active
   - Check user authentication

2. **Webhook Verification Fails**
   - Verify webhook secret in environment
   - Check webhook endpoint URL
   - Ensure proper signature verification

3. **User Deletion Fails**
   - Check if user has active subscriptions
   - Verify admin permissions
   - Check database constraints

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=payment:*,admin:*
```

## 📞 Support

For issues or questions:
1. Check the application logs
2. Verify environment variables
3. Test with payment provider test modes
4. Review webhook configurations

---

**Note**: This implementation provides a solid foundation for a subscription-based CV builder application with comprehensive admin controls and multi-region payment support.

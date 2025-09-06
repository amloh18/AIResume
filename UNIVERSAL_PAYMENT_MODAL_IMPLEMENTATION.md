# Universal Payment Modal Implementation Guide

## Overview

This guide documents the implementation of a universal payment modal system for CVcircle.io that provides seamless upgrade experiences across the entire application. The system includes usage limits checking, coupon code support, and non-disruptive payment flows.

## 🚀 Features Implemented

### ✅ Core Components

1. **UniversalPaymentModal** - Main payment modal component
2. **PaymentModalContext** - Global state management for payment modal
3. **useUsageLimits** - Hook for checking usage limits and triggering upgrades
4. **PaymentTrigger** - Reusable component for triggering payment modal
5. **UpgradePrompt** - Component for showing upgrade prompts when limits are reached

### ✅ API Endpoints

1. **`/api/user/usage-limits`** - Get user's current usage and limits
2. **`/api/discount/validate`** - Validate and apply coupon codes
3. **Updated `/api/checkout/session`** - Enhanced with return URL and context support

### ✅ Database Models

- **PricingPlan** - Plan definitions with limits
- **DiscountCode** - Coupon code management
- **User** - User subscription data
- **Subscription** - Subscription tracking

## 📁 File Structure

```
src/
├── components/payment/
│   ├── UniversalPaymentModal.tsx      # Main payment modal
│   ├── PaymentTrigger.tsx              # Reusable trigger component
│   ├── UpgradePrompt.tsx               # Upgrade prompt component
│   └── PaymentIntegrationExample.tsx   # Example implementation
├── contexts/
│   └── PaymentModalContext.tsx         # Global payment modal state
├── lib/hooks/
│   └── useUsageLimits.ts              # Usage limits hook
└── app/api/
    ├── user/usage-limits/route.ts      # Usage limits API
    └── discount/validate/route.ts      # Coupon validation API
```

## 🔧 Implementation Details

### 1. Universal Payment Modal

The `UniversalPaymentModal` component provides:
- Dynamic plan loading from database
- Coupon code validation and application
- Multiple payment providers (Stripe/Razorpay)
- Seamless return to original page after payment
- Responsive design with dark mode support

**Key Features:**
- Two-step process: Plan selection → Payment
- Real-time discount calculation
- Payment provider auto-detection
- Success/cancel URL handling

### 2. Usage Limits System

The `useUsageLimits` hook provides:
- Real-time usage tracking
- Limit checking for all features
- Automatic upgrade prompts
- Context-aware upgrade suggestions

**Supported Limits:**
- CV Creation Limit
- CV Journey Limit
- ATS Check Limit
- Cover Letter Limit
- Job Creation Limit

### 3. Payment Context

The `PaymentModalContext` provides:
- Global state management
- Modal open/close functionality
- Success callback handling
- Return URL management

## 🎯 Usage Examples

### Basic Payment Trigger

```tsx
import { usePaymentModal } from '@/contexts/PaymentModalContext';

function MyComponent() {
  const { openPaymentModal } = usePaymentModal();

  const handleUpgrade = () => {
    openPaymentModal({
      preselectedPlanKey: 'pro_monthly',
      triggerContext: 'cv-creation',
      returnUrl: window.location.href
    });
  };

  return (
    <button onClick={handleUpgrade}>
      Upgrade to Pro
    </button>
  );
}
```

### Usage Limits Integration

```tsx
import { useUsageLimits } from '@/lib/hooks/useUsageLimits';

function CVCreationButton() {
  const { canCreateCV, triggerCVCreationUpgrade } = useUsageLimits();

  const handleCreateCV = () => {
    const check = canCreateCV();
    if (check.canPerform) {
      // Proceed with CV creation
      createCV();
    } else {
      // Show upgrade prompt
      triggerCVCreationUpgrade('cv-creation');
    }
  };

  return (
    <button 
      onClick={handleCreateCV}
      disabled={!canCreateCV().canPerform}
    >
      Create CV
    </button>
  );
}
```

### Payment Trigger Component

```tsx
import PaymentTrigger from '@/components/payment/PaymentTrigger';

// Different variants
<PaymentTrigger variant="button" preselectedPlanKey="pro_monthly" />
<PaymentTrigger variant="card" preselectedPlanKey="day_pass" />
<PaymentTrigger variant="inline" preselectedPlanKey="pro_yearly">
  Upgrade to unlock more features
</PaymentTrigger>
```

## 🔄 Integration Steps

### Step 1: Add PaymentModalProvider to Layout

The `PaymentModalProvider` has been added to the root layout (`src/app/layout.tsx`):

```tsx
import { PaymentModalProvider } from '@/contexts/PaymentModalContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <SessionProvider>
            <SessionManagerProvider>
              <LoadingProvider>
                <PaymentModalProvider>
                  {children}
                </PaymentModalProvider>
              </LoadingProvider>
            </SessionManagerProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Step 2: Integrate Usage Limits

Replace existing limit checks with the new hook:

```tsx
// Before
const canCreateCV = user.currentPlanKey !== 'free';

// After
const { canCreateCV } = useUsageLimits();
const cvCheck = canCreateCV();
```

### Step 3: Add Payment Triggers

Add payment triggers to key locations:

```tsx
// In navigation
<PaymentTrigger variant="inline" preselectedPlanKey="pro_monthly" />

// In feature cards
<PaymentTrigger variant="card" preselectedPlanKey="pro_yearly" />

// In upgrade prompts
<PaymentTrigger variant="button" preselectedPlanKey="day_pass" />
```

## 🎨 Customization

### Styling

The components use Tailwind CSS with dark mode support. Customize colors by modifying the gradient classes:

```tsx
// Default gradient
className="bg-gradient-to-r from-blue-500 to-purple-600"

// Custom gradient
className="bg-gradient-to-r from-green-500 to-blue-600"
```

### Plan Configuration

Plans are managed through the Admin Dashboard. The system automatically:
- Loads plans from the database
- Applies pricing based on billing cycle
- Validates coupon codes
- Updates user subscriptions

### Usage Limits

Limits are defined in the `PricingPlan` model:
- `maxCVs` - Maximum CV creations
- `maxExports` - Maximum exports/ATS checks
- Additional limits can be added as needed

## 🔒 Security Features

1. **Authentication Required** - All API endpoints require valid session
2. **Input Validation** - All inputs are validated and sanitized
3. **Rate Limiting** - API endpoints include rate limiting
4. **Secure Payment** - Integration with Stripe and Razorpay
5. **Coupon Validation** - Server-side coupon code validation

## 📊 Analytics Integration

The system tracks:
- Payment modal opens by context
- Upgrade prompt triggers
- Successful payments
- Coupon code usage
- Feature usage patterns

## 🚀 Deployment Checklist

- [ ] PaymentModalProvider added to layout
- [ ] API endpoints deployed
- [ ] Database models updated
- [ ] Payment providers configured
- [ ] Coupon codes created in admin dashboard
- [ ] Usage limits configured
- [ ] Testing completed

## 🧪 Testing

Use the `PaymentIntegrationExample` component to test:
- Payment modal functionality
- Usage limits checking
- Coupon code validation
- Upgrade prompts
- Payment triggers

## 📈 Future Enhancements

1. **A/B Testing** - Different upgrade prompts
2. **Personalized Offers** - Context-aware pricing
3. **Usage Analytics** - Detailed usage tracking
4. **Referral System** - Referral-based discounts
5. **Trial Extensions** - Free trial management

## 🐛 Troubleshooting

### Common Issues

1. **Modal not opening** - Check PaymentModalProvider is in layout
2. **Usage limits not updating** - Verify API endpoint is working
3. **Coupon codes not applying** - Check discount validation API
4. **Payment redirects not working** - Verify return URL configuration

### Debug Mode

Enable debug logging by setting:
```bash
NEXT_PUBLIC_DEBUG_PAYMENT=true
```

## 📞 Support

For issues or questions:
1. Check the example component for implementation patterns
2. Verify API endpoints are responding correctly
3. Check browser console for error messages
4. Review the database models for data consistency

---

This implementation provides a complete, production-ready payment modal system that can be easily integrated across the entire CVcircle.io application.

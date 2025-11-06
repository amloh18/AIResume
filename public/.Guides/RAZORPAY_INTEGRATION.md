# Razorpay Integration Guide

## Overview

This document describes the complete Razorpay payment integration for CV Circle, including checkout, webhooks, and subscription management.

## Configuration

### Environment Variables



### Webhook Setup

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL:
   - **Production**: `https://cvcircle.io/api/webhooks/razorpay`
   - **Development**: `https://your-ngrok-url.ngrok.io/api/webhooks/razorpay` (for local testing)
3. Enable following events:
   - `payment.captured`
   - `order.paid`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
4. Copy the webhook secret and add to `RAZORPAY_WEBHOOK_SECRET`

## Integration Points

### 1. Checkout Flow (`/api/checkout/session`)

**Request:**
```json
{
  "planKey": "pro_monthly",
  "interval": "monthly",
  "provider": "razorpay",
  "couponCode": "LAUNCH500",
  "returnUrl": "https://cvcircle.io/dashboard"
}
```

**Endpoint:** `POST https://cvcircle.io/api/checkout/session`

**Response:**
```json
{
  "provider": "razorpay",
  "order_id": "order_xxxxx",
  "amount": 190000,
  "currency": "INR",
  "key_id": "rzp_test_RcM8ql8OqabfNY",
  "checkout": true,
  "coupon": {
    "code": "LAUNCH500",
    "id": "coupon_id"
  }
}
```

### 2. Frontend Integration (`UniversalPaymentModal.tsx`)

The payment modal automatically:
- Loads Razorpay Checkout script when Razorpay is selected
- Opens embedded Razorpay Checkout form
- Handles payment success/failure
- Verifies payment signature

### 3. Payment Verification (`/api/payment/razorpay/verify`)

**Endpoint:** `POST https://cvcircle.io/api/payment/razorpay/verify`

**Request:**
```json
{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_xxxxx",
  "planKey": "pro_monthly",
  "interval": "monthly",
  "couponId": "coupon_id"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "planKey": "pro_monthly",
    "status": "active",
    "interval": "monthly"
  }
}
```

### 4. Webhook Handler (`/api/webhooks/razorpay`)

**Endpoint:** `POST https://cvcircle.io/api/webhooks/razorpay`

Handles the following events:

#### Payment Captured
- Activates day pass or pro plan
- Creates invoice record
- Increments coupon usage
- Uses subscription service for activation

#### Subscription Activated
- Activates recurring subscription (monthly)
- Sets up auto-renewal
- Tracks regional pricing

#### Subscription Charged
- Handles recurring payment
- Updates subscription period
- Creates invoice for renewal

#### Order Paid
- Handles one-time payments (day pass, quarterly, yearly)
- Activates subscription
- Creates invoice

## Features Supported

✅ **Razorpay Checkout** - Embedded payment form
✅ **Regional Pricing** - Automatic region detection and pricing
✅ **Coupon Support** - LAUNCH500 and other coupons
✅ **Time-based Subscriptions** - Day pass, monthly, quarterly, yearly
✅ **Webhook Integration** - Automatic subscription activation
✅ **Payment Verification** - Server-side signature verification
✅ **Invoice Tracking** - All payments recorded in database

## Payment Flow

### One-Time Payment (Day Pass, Quarterly, Yearly)

1. User selects plan and coupon (optional) on `https://cvcircle.io/dashboard/settings?tab=membership`
2. Frontend calls `POST https://cvcircle.io/api/checkout/session`
3. Backend creates Razorpay order
4. Frontend opens Razorpay Checkout modal
5. User completes payment
6. Razorpay calls webhook handler at `https://cvcircle.io/api/webhooks/razorpay`
7. Frontend calls `POST https://cvcircle.io/api/payment/razorpay/verify`
8. Backend verifies signature and activates subscription
9. User redirected to `https://cvcircle.io/dashboard?success=true`
10. Webhook also handles `payment.captured` event (backup)

### Recurring Payment (Monthly)

1. User selects monthly plan on `https://cvcircle.io/dashboard/settings?tab=membership`
2. Frontend calls `POST https://cvcircle.io/api/checkout/session`
3. Backend creates Razorpay order (for first payment)
4. Frontend opens Razorpay Checkout modal
5. User completes payment
6. Razorpay creates subscription automatically
7. Webhook at `https://cvcircle.io/api/webhooks/razorpay` handles `subscription.activated`
8. User redirected to `https://cvcircle.io/dashboard?success=true`
9. Subsequent payments handled via `subscription.charged` webhook

## Testing

### Test Cards (Razorpay Test Mode)

- **Success**: `4111 1111 1111 1111`
- **Failure**: `4000 0000 0000 0002`
- **3D Secure**: `4012 0000 0000 0010`

### Test Coupon

- **Code**: `LAUNCH500`
- **Discount**: 100% on monthly plan
- **Max Uses**: 500

## Error Handling

All payment errors are logged and handled gracefully:
- Invalid signatures are rejected
- Failed payments don't activate subscriptions
- Webhook failures are logged for debugging
- User-friendly error messages in frontend

## Security

- Webhook signature verification
- Payment signature verification
- Server-side payment processing
- No sensitive data in frontend
- Coupon usage tracking and limits

## URLs Reference

### Production URLs
- **Main Site**: `https://cvcircle.io`
- **Dashboard**: `https://cvcircle.io/dashboard`
- **Settings/Membership**: `https://cvcircle.io/dashboard/settings?tab=membership`
- **Checkout API**: `https://cvcircle.io/api/checkout/session`
- **Payment Verification**: `https://cvcircle.io/api/payment/razorpay/verify`
- **Webhook Endpoint**: `https://cvcircle.io/api/webhooks/razorpay`

### Development URLs
- **Local Site**: `http://localhost:3000`
- **Local Dashboard**: `http://localhost:3000/dashboard`
- **Local Settings**: `http://localhost:3000/dashboard/settings?tab=membership`
- **Local Checkout API**: `http://localhost:3000/api/checkout/session`
- **Local Payment Verification**: `http://localhost:3000/api/payment/razorpay/verify`
- **Local Webhook**: Use ngrok or similar: `https://your-ngrok-url.ngrok.io/api/webhooks/razorpay`

### Razorpay Dashboard
- **Dashboard**: `https://dashboard.razorpay.com`
- **Webhooks Settings**: `https://dashboard.razorpay.com/app/webhooks`
- **Test Mode**: Use test keys (`rzp_test_*`) for development

## Support

For issues or questions:
1. Check Razorpay Dashboard (`https://dashboard.razorpay.com`) for payment status
2. Review webhook logs in server console
3. Verify webhook secret matches dashboard
4. Check environment variables are set correctly
5. Test webhook locally using ngrok: `ngrok http 3000`


# Webhook Setup Guide

This guide explains how to set up webhooks for the membership system to handle payment confirmations and subscription updates automatically.

## Overview

The webhook system handles:
- **Stripe payments** (international users)
- **Razorpay payments** (Indian users)
- **Day Pass expiry** (automated cron job)

## 1. Stripe Webhook Setup

### 1.1 Get Webhook Secret
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the signing secret (starts with `whsec_`)

### 1.2 Environment Variables
Add to your `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 1.3 Test Webhook
```bash
# Generate test data
node scripts/test-webhooks.js test

# Test with curl (replace with your domain)
curl -X POST https://yourdomain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: your_signature" \
  -d '{"test": "data"}'
```

## 2. Razorpay Webhook Setup

### 2.1 Get Webhook Secret
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/#/app/webhooks)
2. Click "Add New Webhook"
3. Set endpoint URL: `https://yourdomain.com/api/webhooks/razorpay`
4. Select events:
   - `payment.captured`
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
   - `order.paid`
5. Copy the webhook secret

### 2.2 Environment Variables
Add to your `.env.local`:
```bash
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here
```

### 2.3 Test Webhook
```bash
# Test with curl (replace with your domain)
curl -X POST https://yourdomain.com/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: your_signature" \
  -d '{"test": "data"}'
```

## 3. Day Pass Expiry Cron Job

### 3.1 Environment Variables
Add to your `.env.local`:
```bash
CRON_SECRET=your_secure_random_string_here
```

### 3.2 Setup Cron Job

#### Option A: Vercel Cron (Recommended)
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-day-passes",
      "schedule": "0 * * * *"
    }
  ]
}
```

#### Option B: GitHub Actions
Create `.github/workflows/cron.yml`:
```yaml
name: Day Pass Expiry Cron
on:
  schedule:
    - cron: '0 * * * *'  # Every hour

jobs:
  expire-day-passes:
    runs-on: ubuntu-latest
    steps:
      - name: Call Expiry API
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/expire-day-passes \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

#### Option C: External Cron Service
Use services like:
- [Cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [SetCronJob](https://www.setcronjob.com)

### 3.3 Test Cron Job
```bash
# Test manually
curl -X POST https://yourdomain.com/api/cron/expire-day-passes \
  -H "Authorization: Bearer your_cron_secret"

# Check stats
curl https://yourdomain.com/api/cron/expire-day-passes
```

## 4. Webhook Event Flow

### 4.1 Stripe Events

#### `checkout.session.completed`
- User completes payment
- Updates user subscription
- Creates invoice record
- Activates plan features

#### `invoice.payment_succeeded`
- Recurring payment successful
- Updates subscription period
- Creates invoice record

#### `customer.subscription.updated`
- Subscription status changes
- Updates user plan status
- Handles cancellations

#### `payment_intent.succeeded`
- Day Pass payment successful
- Activates time-limited access
- Sets expiry date

### 4.2 Razorpay Events

#### `payment.captured`
- One-time payment successful
- Handles Day Pass activation
- Creates invoice record

#### `subscription.activated`
- Subscription starts
- Updates user plan
- Sets billing period

#### `subscription.charged`
- Recurring payment successful
- Updates subscription period
- Creates invoice record

#### `subscription.cancelled`
- Subscription cancelled
- Updates user status
- Maintains access until period end

### 4.3 Day Pass Expiry
- Runs every hour
- Finds expired Day Passes
- Downgrades to free plan
- Logs expiry events

## 5. Testing Webhooks

### 5.1 Local Testing
```bash
# Install ngrok for local webhook testing
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, expose local port
ngrok http 3000

# Use ngrok URL in webhook endpoints
# https://abc123.ngrok.io/api/webhooks/stripe
```

### 5.2 Test Scripts
```bash
# Generate test secrets
node scripts/test-webhooks.js secrets

# Test webhook signatures
node scripts/test-webhooks.js test

# List supported events
node scripts/test-webhooks.js events
```

## 6. Monitoring & Debugging

### 6.1 Logs
Webhook events are logged with:
- Event type
- User ID
- Plan key
- Success/failure status

### 6.2 Error Handling
- Invalid signatures return 400
- Missing data returns 400
- Database errors return 500
- All errors are logged

### 6.3 Health Checks
```bash
# Check webhook endpoints
curl https://yourdomain.com/api/webhooks/stripe
curl https://yourdomain.com/api/webhooks/razorpay

# Check cron job stats
curl https://yourdomain.com/api/cron/expire-day-passes
```

## 7. Security Best Practices

### 7.1 Webhook Secrets
- Use strong, unique secrets
- Rotate secrets regularly
- Never commit secrets to code
- Use environment variables

### 7.2 Signature Verification
- Always verify webhook signatures
- Use HTTPS endpoints
- Validate event data
- Handle replay attacks

### 7.3 Rate Limiting
- Implement rate limiting
- Monitor webhook volume
- Set up alerts for failures
- Have fallback mechanisms

## 8. Production Checklist

- [ ] Stripe webhook endpoint configured
- [ ] Razorpay webhook endpoint configured
- [ ] Cron job scheduled
- [ ] Environment variables set
- [ ] Webhook secrets secured
- [ ] HTTPS enabled
- [ ] Monitoring configured
- [ ] Error handling tested
- [ ] Backup procedures in place

## 9. Troubleshooting

### Common Issues

#### Webhook Not Receiving Events
- Check endpoint URL
- Verify webhook is active
- Check signature verification
- Review server logs

#### Signature Verification Fails
- Verify webhook secret
- Check signature header name
- Ensure body is not modified
- Test with webhook testing tools

#### Database Updates Not Working
- Check MongoDB connection
- Verify user/plan IDs
- Review error logs
- Test with sample data

#### Cron Job Not Running
- Check cron schedule
- Verify authorization header
- Review server logs
- Test manually

### Support
For issues with:
- **Stripe**: Check [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- **Razorpay**: Check [Razorpay Webhook Documentation](https://razorpay.com/docs/webhooks)
- **Application**: Review server logs and database state

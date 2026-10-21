import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import { getConnection } from '@/lib/database';
import PaymentProviderSettings from '@/models/PaymentProviderSettings';
import PaymentAuditLog from '@/models/PaymentAuditLog';
import {
  getActiveProviderName,
  setActiveProvider,
  invalidatePaymentProviderCache,
} from '@/lib/payment/paymentProvider';
import { StripeProvider } from '@/lib/payment/providers/stripe';
import { CashfreeProvider } from '@/lib/payment/providers/cashfree';

function maskSecret(secret?: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return '••••••••';
  return `${secret.slice(0, 3)}••••••••${secret.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    await getConnection();

    const settings = (await PaymentProviderSettings.findOne().lean()) as any;
    const activeProvider = settings?.activeProvider || (await getActiveProviderName());
    const version = settings?.configurationVersion || 1;

    // Test health of Stripe
    const stripeProvider = new StripeProvider();
    const stripeHealthy = await stripeProvider.isHealthy();
    const hasStripeSecret = !!(settings?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY);
    const hasStripePublishable = !!(settings?.stripe?.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY);

    // Test health of Cashfree
    const cashfreeProvider = new CashfreeProvider();
    const cashfreeValidation = await cashfreeProvider.validateCredentials();
    const hasCashfreeAppId = !!(settings?.cashfree?.appId || process.env.CASHFREE_APP_ID);
    const hasCashfreeSecret = !!(settings?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY);

    // Fetch recent audit logs
    const auditLogs = await PaymentAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      activeProvider,
      configurationVersion: version,
      updatedAt: settings?.updatedAt || null,
      updatedBy: settings?.updatedBy || null,
      stripe: {
        enabled: settings?.stripe?.enabled ?? true,
        environment: settings?.stripe?.environment || 'production',
        publishableKey: settings?.stripe?.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY || '',
        hasSecretKey: hasStripeSecret,
        maskedSecretKey: hasStripeSecret ? '••••••••' : '',
        status: hasStripeSecret && hasStripePublishable ? (stripeHealthy ? 'configured' : 'invalid') : 'missing',
        isHealthy: stripeHealthy,
        lastVerification: settings?.lastVerification?.stripe || null,
      },
      cashfree: {
        enabled: settings?.cashfree?.enabled ?? true,
        environment: settings?.cashfree?.environment || process.env.CASHFREE_ENVIRONMENT || 'sandbox',
        appId: settings?.cashfree?.appId || process.env.CASHFREE_APP_ID || '',
        hasSecretKey: hasCashfreeSecret,
        maskedSecretKey: hasCashfreeSecret ? '••••••••' : '',
        status: hasCashfreeAppId && hasCashfreeSecret ? (cashfreeValidation.valid ? 'configured' : 'invalid') : 'missing',
        isHealthy: cashfreeValidation.valid,
        validationError: cashfreeValidation.error || null,
        lastVerification: settings?.lastVerification?.cashfree || null,
      },
      recentAuditLogs: auditLogs,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Payment Settings GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    const adminEmail = (session.user as any)?.email || 'admin';
    const adminId = (session.user as any)?.id || '';

    await getConnection();

    const body = await request.json();
    const { action, activeProvider: targetProvider, expectedVersion, stripe, cashfree } = body;

    const currentSettings = (await PaymentProviderSettings.findOne()) || (await PaymentProviderSettings.create({
      activeProvider: 'stripe',
      configurationVersion: 1,
    }));

    const previousProvider = currentSettings.activeProvider;

    // ── Concurrency Check ──────────────────────────────────────────────────
    if (expectedVersion && currentSettings.configurationVersion !== expectedVersion) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration version conflict. The settings have been updated by another administrator. Please refresh.',
          currentVersion: currentSettings.configurationVersion,
        },
        { status: 409 }
      );
    }

    // ── Action: Test Connection ────────────────────────────────────────────
    if (action === 'test_connection') {
      const providerToTest = body.provider || targetProvider || currentSettings.activeProvider;

      if (providerToTest === 'stripe') {
        const stripeProvider = new StripeProvider();
        const healthy = await stripeProvider.isHealthy();
        return NextResponse.json({
          success: true,
          provider: 'stripe',
          healthy,
          message: healthy ? 'Stripe credentials validated successfully.' : 'Stripe credentials could not be verified.',
        });
      }

      if (providerToTest === 'cashfree') {
        const cashfreeProvider = new CashfreeProvider(cashfree);
        const validation = await cashfreeProvider.validateCredentials();
        return NextResponse.json({
          success: true,
          provider: 'cashfree',
          healthy: validation.valid,
          environment: validation.environment,
          message: validation.valid
            ? `Cashfree credentials validated successfully in ${validation.environment} mode.`
            : `Cashfree validation failed: ${validation.error || 'Check App ID and Secret Key'}`,
          error: validation.error,
        });
      }

      return NextResponse.json({ success: false, error: 'Unknown provider to test' }, { status: 400 });
    }

    // ── Action: Update Configuration (Credentials/Environment) ─────────────
    if (action === 'update_config') {
      const updates: any = {};

      if (cashfree) {
        updates['cashfree.enabled'] = cashfree.enabled ?? currentSettings.cashfree?.enabled ?? true;
        if (cashfree.appId !== undefined) updates['cashfree.appId'] = cashfree.appId.trim();
        if (cashfree.secretKey && !cashfree.secretKey.includes('••')) {
          updates['cashfree.secretKey'] = cashfree.secretKey.trim();
        }
        if (cashfree.environment) updates['cashfree.environment'] = cashfree.environment;
        if (cashfree.webhookEndpoint) updates['cashfree.webhookEndpoint'] = cashfree.webhookEndpoint.trim();
        if (cashfree.webhookSecret && !cashfree.webhookSecret.includes('••')) {
          updates['cashfree.webhookSecret'] = cashfree.webhookSecret.trim();
        }
      }

      if (stripe) {
        updates['stripe.enabled'] = stripe.enabled ?? currentSettings.stripe?.enabled ?? true;
        if (stripe.publishableKey !== undefined) updates['stripe.publishableKey'] = stripe.publishableKey.trim();
        if (stripe.secretKey && !stripe.secretKey.includes('••')) {
          updates['stripe.secretKey'] = stripe.secretKey.trim();
        }
        if (stripe.environment) updates['stripe.environment'] = stripe.environment;
        if (stripe.webhookEndpoint) updates['stripe.webhookEndpoint'] = stripe.webhookEndpoint.trim();
        if (stripe.webhookSecret && !stripe.webhookSecret.includes('••')) {
          updates['stripe.webhookSecret'] = stripe.webhookSecret.trim();
        }
      }

      updates.updatedBy = adminEmail;
      updates.updatedAt = new Date();

      const updated = await PaymentProviderSettings.findOneAndUpdate(
        {},
        { $set: updates, $inc: { configurationVersion: 1 } },
        { new: true, upsert: true }
      );

      invalidatePaymentProviderCache();

      await PaymentAuditLog.create({
        adminId,
        adminEmail,
        previousProvider,
        newProvider: updated.activeProvider,
        configurationVersion: updated.configurationVersion,
        action: 'update_config',
        status: 'success',
        details: { updatedKeys: Object.keys(updates) },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        configurationVersion: updated.configurationVersion,
        message: 'Payment configuration saved successfully.',
      });
    }

    // ── Action: Switch Active Provider ─────────────────────────────────────
    if (action === 'switch_provider') {
      if (!targetProvider || (targetProvider !== 'stripe' && targetProvider !== 'cashfree')) {
        return NextResponse.json(
          { success: false, error: 'Invalid provider. Must be "stripe" or "cashfree".' },
          { status: 400 }
        );
      }

      // Step 2 & 3: Validate that the target provider is operational before switching
      if (targetProvider === 'stripe') {
        const stripeProvider = new StripeProvider();
        const healthy = await stripeProvider.isHealthy();
        if (!healthy) {
          await PaymentAuditLog.create({
            adminId,
            adminEmail,
            previousProvider,
            newProvider: targetProvider,
            configurationVersion: currentSettings.configurationVersion,
            action: 'switch_provider',
            status: 'failure',
            reason: 'Stripe credential validation failed',
          });

          return NextResponse.json(
            {
              success: false,
              error: 'Cannot activate Stripe: Credential validation failed. Active provider remains unchanged.',
              activeProvider: previousProvider,
            },
            { status: 400 }
          );
        }
      } else if (targetProvider === 'cashfree') {
        const cashfreeProvider = new CashfreeProvider();
        const validation = await cashfreeProvider.validateCredentials();
        if (!validation.valid) {
          await PaymentAuditLog.create({
            adminId,
            adminEmail,
            previousProvider,
            newProvider: targetProvider,
            configurationVersion: currentSettings.configurationVersion,
            action: 'switch_provider',
            status: 'failure',
            reason: validation.error || 'Cashfree credential validation failed',
          });

          return NextResponse.json(
            {
              success: false,
              error: `Cannot activate Cashfree: ${validation.error || 'Credential validation failed'}. Active provider remains unchanged.`,
              activeProvider: previousProvider,
            },
            { status: 400 }
          );
        }
      }

      // Step 4 & 5: Persist change atomically and increment configuration version
      const updated = await setActiveProvider(targetProvider, adminEmail);

      // Step 8: Record audit log
      await PaymentAuditLog.create({
        adminId,
        adminEmail,
        previousProvider,
        newProvider: targetProvider,
        configurationVersion: updated.configurationVersion,
        action: 'switch_provider',
        status: 'success',
        details: {
          previousProvider,
          newProvider: targetProvider,
          switchedAt: new Date(),
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        activeProvider: targetProvider,
        configurationVersion: updated.configurationVersion,
        message: `Active payment provider successfully switched from ${previousProvider.toUpperCase()} to ${targetProvider.toUpperCase()}. New checkouts will use ${targetProvider.toUpperCase()} immediately.`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action requested' }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Payment Settings POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

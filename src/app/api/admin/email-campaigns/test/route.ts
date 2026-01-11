
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { sendEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { emails, subject, htmlContent, fromName, fromEmail } = body;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ success: false, error: 'No test emails provided' }, { status: 400 });
        }

        console.log(`🧪 Sending test emails to: ${emails.join(', ')}`);

        const results = {
            sent: 0,
            failed: 0,
            errors: [] as string[]
        };

        // 2. Process each test email
        await Promise.all(emails.map(async (email) => {
            try {
                let content = htmlContent;
                let subj = subject;

                // Mock Variable Replacements
                content = content.replace(/{{firstName}}/g, 'Test User');
                content = content.replace(/{{lastName}}/g, '');
                content = content.replace(/{{email}}/g, email);

                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cvcircle.io';
                content = content.replace(/{{appUrl}}/g, appUrl);

                // Mock Unsubscribe for Test
                const unsubscribeUrl = `${appUrl}/unsubscribe?test=true`;
                if (content.includes('{{unsubscribeUrl}}')) {
                    content = content.replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);
                } else if (!content.includes('Unsubscribe')) {
                    const unsubscribeFooter = `
                <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #666;">
                  [TEST EMAIL] <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a>
                </div>
              `;
                    if (content.includes('</body>')) {
                        content = content.replace('</body>', `${unsubscribeFooter}</body>`);
                    } else {
                        content += unsubscribeFooter;
                    }
                }

                subj = subj.replace(/{{firstName}}/g, 'Test User');

                // Send
                const result = await sendEmail({
                    to: email,
                    subject: `[TEST] ${subj}`, // Prefix with [TEST]
                    html: content,
                    text: content, // Fallback
                    from: fromEmail ? `${fromName} <${fromEmail}>` : undefined
                });

                if (result.success) {
                    results.sent++;
                } else {
                    results.failed++;
                    results.errors.push(`${email}: ${result.error}`);
                }

            } catch (err: any) {
                results.failed++;
                results.errors.push(`${email}: ${err.message}`);
            }
        }));

        return NextResponse.json({
            success: true,
            message: `Sent ${results.sent} test emails`,
            results
        });

    } catch (error: any) {
        console.error('Test email error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

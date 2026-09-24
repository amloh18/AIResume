import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import UKSponsor from '@/models/UKSponsor';
import USH1BEmployer from '@/models/USH1BEmployer';
import { getConnection } from '@/lib/database';

export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser || authUser.user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const country = searchParams.get('country');

        if (!country || !['uk', 'us'].includes(country)) {
            return NextResponse.json({ success: false, error: 'Invalid country' }, { status: 400 });
        }

        await getConnection();

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                
                try {
                    if (country === 'uk') {
                        controller.enqueue(encoder.encode('Company Name,Licence Number,Status,Expiry Date,Last Updated\n'));
                        
                        // @ts-ignore pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
                        const cursor = UKSponsor.find({}).cursor();
                        
                        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                            const row = [
                                `"${(doc.companyName || '').replace(/"/g, '""')}"`,
                                `"${(doc.licenceNumber || '').replace(/"/g, '""')}"`,
                                `"${doc.status || ''}"`,
                                doc.expiryDate ? doc.expiryDate.toISOString() : '',
                                doc.updatedAt ? doc.updatedAt.toISOString() : ''
                            ].join(',') + '\n';
                            controller.enqueue(encoder.encode(row));
                        }
                    } else {
                        controller.enqueue(encoder.encode('Employer Name,FEIN,Last Filed Year,Last Updated\n'));
                        
                        // @ts-ignore pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
                        const cursor = USH1BEmployer.find({}).cursor();
                        
                        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                            const row = [
                                `"${(doc.employerName || '').replace(/"/g, '""')}"`,
                                `"${(doc.fein || '').replace(/"/g, '""')}"`,
                                `"${doc.lastFiledYear || ''}"`,
                                doc.updatedAt ? doc.updatedAt.toISOString() : ''
                            ].join(',') + '\n';
                            controller.enqueue(encoder.encode(row));
                        }
                    }
                    controller.close();
                } catch (error) {
                    console.error('Download stream error:', error);
                    controller.error(error);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="sponsorship-${country}-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error: any) {
        console.error('Sponsorship download error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

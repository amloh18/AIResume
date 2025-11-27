import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database/connection-manager';
import { Template, CV, Testimonial } from '@/models';
import { withAdminAuth } from '@/lib/middleware/admin-auth';

export const GET = withAdminAuth(async (request: NextRequest) => {
    try {
        await getConnection();

        const [
            totalTemplates,
            totalTestimonials,
            templatesByCategory,
            popularTemplates
        ] = await Promise.all([
            Template.countDocuments({}),
            Testimonial.countDocuments({}),
            Template.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]),
            CV.aggregate([
                { $match: { templateName: { $exists: true, $ne: null } } },
                { $group: { _id: '$templateName', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ])
        ]);

        return NextResponse.json({
            totalTemplates,
            totalTestimonials,
            templatesByCategory,
            popularTemplates
        });
    } catch (error) {
        console.error('Error fetching content analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch content analytics' },
            { status: 500 }
        );
    }
});

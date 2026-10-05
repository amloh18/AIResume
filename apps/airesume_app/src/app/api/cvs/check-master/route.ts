// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

/**
 * GET /api/cvs/check-master
 * Check if the authenticated user has a Master CV
 * Returns: { hasMasterCV: boolean, masterCVId?: string }
 */
export async function GET(request: NextRequest) {
    try {
        await getConnection();

        const authResult = await getAuthenticatedUser();
        if (!authResult) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = authResult.userId;

        // Check for Master CV using multiple criteria
        // 1. metadata.isMaster: true (preferred)
        // 2. cvType: 'master'
        // 3. createdVia: 'ai-career-report' (legacy)
        const masterCV = await CV.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            $or: [
                { 'metadata.isMaster': true },
                { 'metadata.isMaster': 'true' },
                { cvType: 'master' },
                { 'metadata.createdVia': 'ai-career-report' }
            ]
        }).select('_id title cvType metadata.isMaster createdAt').lean();

        const hasMasterCV = !!masterCV;
        const masterCVId = masterCV?._id?.toString();

        console.log('🔍 Check Master CV API:', {
            userId,
            hasMasterCV,
            masterCVId,
            masterCVTitle: masterCV?.title
        });

        return NextResponse.json({
            success: true,
            hasMasterCV,
            masterCVId,
            data: masterCV ? {
                id: masterCVId,
                title: masterCV.title,
                cvType: masterCV.cvType,
                createdAt: masterCV.createdAt
            } : null
        });

    } catch (error: any) {
        console.error('❌ Check Master CV error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to check Master CV status'
            },
            { status: 500 }
        );
    }
}

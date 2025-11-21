import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import JobApplication from '@/models/JobApplication';
import mongoose from 'mongoose';

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
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const status = searchParams.get('status'); // Optional status filter

    // Build query
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get jobs
    const jobs = await JobApplication.find(query).lean();

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Job Title',
        'Company',
        'Location',
        'Status',
        'Priority',
        'Application Date',
        'Deadline',
        'Salary Min',
        'Salary Max',
        'Source',
        'Tags',
        'Notes',
        'Created At',
        'Updated At'
      ];

      const rows = jobs.map(job => [
        job.jobTitle || '',
        job.company || '',
        job.location || '',
        job.status || '',
        job.priority || 'medium',
        job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : '',
        job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
        job.salary?.min || '',
        job.salary?.max || '',
        job.source || '',
        (job.tags || []).join('; '),
        (job.notes || '').replace(/\n/g, ' ').replace(/,/g, ';'),
        job.createdAt ? new Date(job.createdAt).toISOString() : '',
        job.updatedAt ? new Date(job.updatedAt).toISOString() : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="jobs-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // JSON format
    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          id: job._id,
          jobTitle: job.jobTitle,
          company: job.company,
          location: job.location,
          status: job.status,
          priority: job.priority,
          applicationDate: job.applicationDate,
          deadline: job.deadline,
          salary: job.salary,
          source: job.source,
          tags: job.tags,
          notes: job.notes,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        })),
        count: jobs.length,
        exportedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error exporting jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export jobs' },
      { status: 500 }
    );
  }
}


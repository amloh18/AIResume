import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import connectDB from '@/lib/database';
import Job from '@/models/Job';
import { createErrorResponse } from '@/lib/db-utils';
import { v4 as uuidv4 } from 'uuid';

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { url, userId, demo = false } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, message: 'URL is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate that it's an Indeed URL (unless in demo mode)
    if (!demo && !url.includes('indeed.com')) {
      return NextResponse.json(
        { success: false, message: 'Only Indeed URLs are supported' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if job already exists (skip in demo mode)
    if (!demo) {
      const existingJob = await Job.findOne({ sourceUrl: url });
      if (existingJob) {
        return NextResponse.json({
          success: true,
          message: 'Job already exists',
          data: existingJob
        }, { headers: corsHeaders });
      }
    }

    // Fetch the HTML content
    console.log('Fetching URL:', url);
    
    let html = '';
    let $: any;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        }
      });

      console.log('Response status:', response.status);
      html = response.data;
      console.log('HTML length:', html.length);
      $ = cheerio.load(html);
         } catch (fetchError: any) {
       console.error('Error fetching URL:', fetchError.message);
       
       // For testing purposes, create a mock response
       if (demo || url.includes('test') || url.includes('demo')) {
         console.log('Creating demo response');
         html = `
           <html>
             <body>
               <h1 data-testid="jobsearch-JobInfoHeader-title">Senior Software Engineer</h1>
               <div data-testid="jobsearch-JobInfoHeader-companyName">TechCorp Inc.</div>
               <div data-testid="jobDescriptionText">We are looking for a Senior Software Engineer to join our growing team. You will be responsible for developing and maintaining web applications, working with modern technologies like React, Node.js, and MongoDB. The ideal candidate will have 5+ years of experience in software development and a passion for creating high-quality, scalable solutions.</div>
               <div data-testid="attribute_snippet_compensation">$120,000 - $180,000 a year</div>
             </body>
           </html>
         `;
         $ = cheerio.load(html);
       } else {
         // For real Indeed URLs that fail, provide a helpful error message
         console.error('Failed to fetch Indeed URL:', fetchError.message);
         throw new Error(`Unable to access the Indeed job posting. This might be due to:
1. The job posting has been removed or is no longer available
2. Indeed is temporarily blocking automated requests
3. The URL format is not supported

Please try:
- Verifying the URL is correct and the job is still active
- Waiting a few minutes and trying again
- Manually adding the job information instead`);
       }
     }

    // Extract job data using Indeed's HTML structure
    let title = '';
    let company = '';
    let description = '';
    let salary = '';
    let deadline = null;
    let sponsorship = false;

    // Job title - try multiple selectors
    title = $('[data-testid="jobsearch-JobInfoHeader-title"] h1').text().trim() ||
            $('.jobsearch-JobInfoHeader-title h1').text().trim() ||
            $('h1[data-testid="jobsearch-JobInfoHeader-title"]').text().trim() ||
            $('.jobsearch-JobInfoHeader-title').text().trim() ||
            $('h1').first().text().trim();

    // Company name - try multiple selectors
    company = $('[data-testid="jobsearch-JobInfoHeader-companyName"]').text().trim() ||
              $('.jobsearch-JobInfoHeader-companyName').text().trim() ||
              $('[data-testid="inlineHeader-companyName"]').text().trim() ||
              $('.companyName').text().trim() ||
              $('[data-testid="jobsearch-JobInfoHeader-companyName"] a').text().trim();

    // Job description - try multiple selectors
    description = $('[data-testid="jobDescriptionText"]').text().trim() ||
                  $('.jobsearch-JobComponent-description').text().trim() ||
                  $('.job-description').text().trim() ||
                  $('[data-testid="jobDescriptionText"] div').text().trim();

    // Salary information - try multiple selectors
    salary = $('[data-testid="attribute_snippet_compensation"]').text().trim() ||
             $('.jobsearch-JobComponent-description .salary-snippet').text().trim() ||
             $('[data-testid="compensation"]').text().trim();

    // Check for sponsorship (work visa sponsorship)
    const descriptionText = description.toLowerCase();
    sponsorship = descriptionText.includes('sponsorship') || 
                  descriptionText.includes('work visa') ||
                  descriptionText.includes('h1b') ||
                  descriptionText.includes('visa sponsorship') ||
                  descriptionText.includes('will sponsor');

    // Generate a unique job ID
    const jobid = uuidv4();

    // Parse salary if available
    let parsedSalary = null;
    if (salary) {
      const salaryMatch = salary.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(k|K|thousand|K)?/);
      if (salaryMatch) {
        const min = parseFloat(salaryMatch[1].replace(/,/g, ''));
        const max = parseFloat(salaryMatch[2].replace(/,/g, ''));
        parsedSalary = {
          min: min * (salaryMatch[3] ? 1000 : 1),
          max: max * (salaryMatch[3] ? 1000 : 1),
          currency: 'USD',
          period: 'yearly'
        };
      }
    }

    // Create the job document
    const jobData = {
      jobid,
      title: title || 'Job Title Not Found',
      company: company || 'Company Not Found',
      description: description || 'Job description not available',
      sourceUrl: url,
      salary: parsedSalary,
      sponsorship,
      userId: userId || null
    };

    const job = new Job(jobData);
    await job.save();

    return NextResponse.json({
      success: true,
      message: 'Job parsed and stored successfully',
      data: job
    }, { status: 201, headers: corsHeaders });

  } catch (error: any) {
    console.error('Parse job error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    
    // Handle specific axios errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { success: false, message: 'Unable to access the job URL. Please check if the URL is valid.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (error.response?.status === 404) {
      return NextResponse.json(
        { success: false, message: 'Job posting not found or has been removed.' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (error.response?.status === 403) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Indeed may be blocking automated requests. Please try again later or use a different job URL.' },
        { status: 403, headers: corsHeaders }
      );
    }

    if (error.response?.status === 429) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please wait a moment and try again.' },
        { status: 429, headers: corsHeaders }
      );
    }

    // Return a simple error response
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to parse job. Please try again or add the job manually.',
        statusCode: 500 
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 
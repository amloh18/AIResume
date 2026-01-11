
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import UKSponsor from '@/models/UKSponsor';
import USH1BEmployer from '@/models/USH1BEmployer';
import { normalizeCompanyName } from '@/lib/utils/company-name-normalizer';
import { getConnection } from '@/lib/database';

// Helper to parse CSV manually (reusing logic from standalone scripts)
function parseCSV(content: string): string[][] {
    const lines = content.split('\n');
    const result: string[][] = [];

    if (lines.length === 0) return result;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        result.push(values);
    }
    return result;
}

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check (Admin Only)
        const authUser = await getAuthenticatedUser();
        if (!authUser || authUser.user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        await getConnection();

        // 2. Parse Form Data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const country = formData.get('country') as string;

        if (!file || !country) {
            return NextResponse.json({ success: false, error: 'Missing file or country' }, { status: 400 });
        }

        if (!['uk', 'us'].includes(country)) {
            return NextResponse.json({ success: false, error: 'Invalid country. Must be uk or us.' }, { status: 400 });
        }

        // 3. Read File Content
        const fileContent = await file.text();
        const rows = parseCSV(fileContent);

        if (rows.length < 2) {
            return NextResponse.json({ success: false, error: 'CSV file is empty or invalid' }, { status: 400 });
        }

        const headers = rows[0].map(h => h.toLowerCase().replace(/^"|"$/g, ''));
        const dataRows = rows.slice(1);

        const stats = {
            imported: 0,
            updated: 0,
            errors: 0
        };

        // 4. Process Rows based on Country
        if (country === 'uk') {
            // Map headers
            const indices = {
                companyName: headers.findIndex(h => h.includes('company') || h.includes('name') || h.includes('organisation')),
                licence: headers.findIndex(h => h.includes('licence') || h.includes('license')),
                status: headers.findIndex(h => h.includes('status')),
                expiry: headers.findIndex(h => h.includes('expiry') || h.includes('expire'))
            };

            if (indices.companyName === -1) {
                return NextResponse.json({ success: false, error: 'Could not find "Company Name" or "Organisation Name" column in CSV' }, { status: 400 });
            }

            // Bulk operations are faster, but loop logic handles complex unique checks better
            // For simplicity and "upsert" requirement, loop is fine for 1000s (might be slow for 100k)
            // We'll use loop for now.

            for (const row of dataRows) {
                try {
                    const companyName = (row[indices.companyName] || '').replace(/^"|"$/g, '');
                    if (!companyName) continue;

                    const licenceNumber = indices.licence !== -1 ? (row[indices.licence] || '').replace(/^"|"$/g, '') : undefined;
                    let status = indices.status !== -1 ? (row[indices.status] || '').replace(/^"|"$/g, '') : 'Active';
                    if (!status) status = 'Active';

                    let expiryDate: Date | undefined;
                    if (indices.expiry !== -1) {
                        const expiryStr = (row[indices.expiry] || '').replace(/^"|"$/g, '');
                        if (expiryStr) expiryDate = new Date(expiryStr);
                    }

                    const normalized = normalizeCompanyName(companyName);

                    const result = await UKSponsor.findOneAndUpdate(
                        {
                            normalizedName: normalized,
                            // Try to match exact licence if available, otherwise just name
                            ...(licenceNumber ? { licenceNumber } : {})
                        },
                        {
                            companyName,
                            normalizedName: normalized,
                            licenceNumber,
                            status,
                            expiryDate,
                            updatedAt: new Date()
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true, rawResult: true }
                    );

                    if (result.lastErrorObject?.updatedExisting) {
                        stats.updated++;
                    } else {
                        stats.imported++;
                    }
                } catch (err) {
                    stats.errors++;
                }
            }

        } else if (country === 'us') {
            // US Logic
            const indices = {
                employerName: headers.findIndex(h => h.includes('employer') || h.includes('company') || h.includes('name')),
                fein: headers.findIndex(h => h.includes('fein') || h.includes('ein') || h.includes('tax_id')),
                year: headers.findIndex(h => h.includes('year') || h.includes('filed'))
            };

            if (indices.employerName === -1) {
                return NextResponse.json({ success: false, error: 'Could not find "Employer Name" column in CSV' }, { status: 400 });
            }

            for (const row of dataRows) {
                try {
                    const employerName = (row[indices.employerName] || '').replace(/^"|"$/g, '');
                    if (!employerName) continue;

                    const fein = indices.fein !== -1 ? (row[indices.fein] || '').replace(/^"|"$/g, '') : undefined;
                    let lastFiledYear = new Date().getFullYear();
                    if (indices.year !== -1) {
                        const yearStr = (row[indices.year] || '').replace(/^"|"$/g, '');
                        const parsed = parseInt(yearStr);
                        if (!isNaN(parsed) && parsed > 2000) lastFiledYear = parsed;
                    }

                    const normalized = normalizeCompanyName(employerName);

                    const result = await USH1BEmployer.findOneAndUpdate(
                        {
                            normalizedName: normalized,
                            ...(fein ? { fein } : {})
                        },
                        {
                            employerName,
                            normalizedName: normalized,
                            fein,
                            lastFiledYear,
                            updatedAt: new Date()
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true, rawResult: true }
                    );

                    if (result.lastErrorObject?.updatedExisting) {
                        stats.updated++;
                    } else {
                        stats.imported++;
                    }

                } catch (err) {
                    stats.errors++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            stats,
            message: `Processed ${rows.length - 1} rows. Added: ${stats.imported}, Updated: ${stats.updated}, Errors: ${stats.errors}`
        });

    } catch (error: any) {
        console.error('Sponsorship upload error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

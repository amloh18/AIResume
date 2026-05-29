
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import UKSponsor from '@/models/UKSponsor';
import USH1BEmployer from '@/models/USH1BEmployer';
import { normalizeCompanyName } from '@/lib/utils/company-name-normalizer';
import { getConnection } from '@/lib/database';

// Helper to parse CSV/TSV manually
function parseCSV(content: string, delimiter: string = ','): string[][] {
    const lines = content.split(/\r?\n/); // Handle both \n and \r\n
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
            } else if (char === delimiter && !inQuotes) {
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

// Helper to escape newlines for NDJSON if needed, but we'll send discrete JSON objects per line
function sendEvent(controller: ReadableStreamDefaultController, data: any) {
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
}

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Starting Sponsorship Upload (Streaming)...');

        // 1. Auth Check (Admin Only)
        // Note: For streaming, we should check auth quickly before starting the stream
        const authUser = await getAuthenticatedUser();
        if (!authUser || authUser.user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const country = formData.get('country') as string;

        if (!file || !country) {
            return NextResponse.json({ success: false, error: 'Missing file or country' }, { status: 400 });
        }

        if (!['uk', 'us'].includes(country)) {
            return NextResponse.json({ success: false, error: 'Invalid country. Must be uk or us.' }, { status: 400 });
        }

        // Create the stream
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    sendEvent(controller, { type: 'log', message: `📂 Reading file for ${country.toUpperCase()}...` });

                    // Connect DB inside stream to ensure it's ready
                    await getConnection();

                    // 2. Parse File (Memory efficient enough for 150k rows ~ 20-50MB)
                    // Use ArrayBuffer to detect encoding manually
                    const buffer = await file.arrayBuffer();
                    const uint8Array = new Uint8Array(buffer);

                    let decoder;
                    let contentStartOffset = 0;

                    // Detect Encoding via BOM
                    if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
                        decoder = new TextDecoder('utf-16le');
                        contentStartOffset = 2; // Skip BOM
                    } else if (uint8Array[0] === 0xFE && uint8Array[1] === 0xFF) {
                        decoder = new TextDecoder('utf-16be');
                        contentStartOffset = 2; // Skip BOM
                    } else if (uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
                        decoder = new TextDecoder('utf-8');
                        contentStartOffset = 3; // Skip BOM
                    } else {
                        // Fallback: Check for null bytes which suggest UTF-16LE (common in Windows CSV exports)
                        // If we see nulls in the first 100 bytes, likely 16LE
                        let hasNulls = false;
                        for (let i = 0; i < Math.min(100, uint8Array.length); i++) {
                            if (uint8Array[i] === 0) {
                                hasNulls = true;
                                break;
                            }
                        }
                        if (hasNulls) {
                            decoder = new TextDecoder('utf-16le');
                        } else {
                            decoder = new TextDecoder('utf-8');
                        }
                    }

                    const fileContent = decoder.decode(uint8Array.slice(contentStartOffset));

                    // Auto-detect delimiter
                    // Check first line for tab vs comma count
                    const firstLineIdx = fileContent.indexOf('\n');
                    const firstLine = fileContent.slice(0, firstLineIdx === -1 ? fileContent.length : firstLineIdx);
                    const tabCount = (firstLine.match(/\t/g) || []).length;
                    const commaCount = (firstLine.match(/,/g) || []).length;

                    const delimiter = (tabCount > 0 && tabCount >= commaCount) ? '\t' : ',';

                    sendEvent(controller, { type: 'log', message: `🔍 Detected delimiter: ${delimiter === '\t' ? 'TAB' : 'COMMA'}` });

                    const rows = parseCSV(fileContent, delimiter);

                    if (rows.length < 2) {
                        sendEvent(controller, { type: 'error', message: 'CSV file is empty or invalid' });
                        controller.close();
                        return;
                    }

                    const headers = rows[0].map(h =>
                        h.replace(/^\ufeff/, '').trim().toLowerCase().replace(/^"|"$/g, '')
                    );
                    const dataRows = rows.slice(1);
                    const totalRows = dataRows.length;

                    sendEvent(controller, { type: 'start', total: totalRows, message: `📊 Found ${totalRows} rows. Starting processing...` });

                    const stats = {
                        imported: 0,
                        updated: 0,
                        errors: 0
                    };

                    const CHUNK_SIZE = 2500; // Larger chunks for speed
                    const CONCURRENCY = 5;   // Process 5 chunks in parallel

                    // Prepare config based on country
                    let indices: any = {};
                    let Collection: any;

                    if (country === 'uk') {
                        Collection = UKSponsor;
                        indices = {
                            companyName: headers.findIndex(h => h.includes('company') || h.includes('name') || h.includes('organisation')),
                            licence: headers.findIndex(h => h.includes('licence') || h.includes('license')),
                            status: headers.findIndex(h => h.includes('status')),
                            expiry: headers.findIndex(h => h.includes('expiry') || h.includes('expire'))
                        };
                        if (indices.companyName === -1) {
                            throw new Error(`Could not find "Company Name" column. Found: ${headers.join(', ')}`);
                        }
                    } else {
                        Collection = USH1BEmployer;
                        // Enhanced mapping for "Employer Information.csv" format
                        indices = {
                            employerName: headers.findIndex(h => h.includes('employer') || h.includes('petitioner name') || h.includes('company')),
                            fein: headers.findIndex(h => h.includes('tax id') || h.includes('fein') || h.includes('ein')),
                            year: headers.findIndex(h => h.includes('fiscal year') || h.includes('year'))
                        };
                        if (indices.employerName === -1) {
                            throw new Error(`Could not find "Employer Name" column. Found: ${headers.join(', ')}`);
                        }
                    }

                    // Process loops
                    let processedCount = 0;

                    // Create chunks
                    const allChunks = [];
                    for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
                        allChunks.push(dataRows.slice(i, i + CHUNK_SIZE));
                    }

                    console.log(`⚡ Processing ${allChunks.length} chunks with concurrency ${CONCURRENCY}...`);

                    // Process chunks in batches of CONCURRENCY
                    for (let i = 0; i < allChunks.length; i += CONCURRENCY) {
                        const batch = allChunks.slice(i, i + CONCURRENCY);

                        await Promise.all(batch.map(async (chunk, batchIndex) => {
                            const operations = [];

                            for (const row of chunk) {
                                try {
                                    if (country === 'uk') {
                                        const companyName = (row[indices.companyName] || '').replace(/^"|"$/g, '');
                                        if (!companyName) continue;
                                        const normalized = normalizeCompanyName(companyName);
                                        const licenceNumber = indices.licence !== -1 ? (row[indices.licence] || '').replace(/^"|"$/g, '') : undefined;
                                        const status = indices.status !== -1 ? ((row[indices.status] || '').replace(/^"|"$/g, '') || 'Active') : 'Active';
                                        let expiryDate: Date | undefined;
                                        if (indices.expiry !== -1) {
                                            const expiryStr = (row[indices.expiry] || '').replace(/^"|"$/g, '');
                                            if (expiryStr) expiryDate = new Date(expiryStr);
                                        }

                                        operations.push({
                                            updateOne: {
                                                filter: { normalizedName: normalized, ...(licenceNumber ? { licenceNumber } : {}) },
                                                update: { $set: { companyName, normalizedName: normalized, licenceNumber, status, expiryDate, updatedAt: new Date() } },
                                                upsert: true
                                            }
                                        });

                                    } else { // US
                                        const employerName = (row[indices.employerName] || '').replace(/^"|"$/g, '');
                                        if (!employerName) continue;
                                        const normalized = normalizeCompanyName(employerName);
                                        const fein = indices.fein !== -1 ? (row[indices.fein] || '').replace(/^"|"$/g, '') : undefined;
                                        let lastFiledYear = new Date().getFullYear();
                                        if (indices.year !== -1) {
                                            const yearStr = (row[indices.year] || '').replace(/^"|"$/g, '');
                                            const parsed = parseInt(yearStr);
                                            if (!isNaN(parsed) && parsed > 2000) lastFiledYear = parsed;
                                        }

                                        operations.push({
                                            updateOne: {
                                                filter: { normalizedName: normalized, ...(fein ? { fein } : {}) },
                                                update: { $set: { employerName, normalizedName: normalized, fein, lastFiledYear, updatedAt: new Date() } },
                                                upsert: true
                                            }
                                        });
                                    }
                                } catch (err) {
                                    stats.errors++;
                                }
                            }

                            if (operations.length > 0) {
                                try {
                                    const result = await Collection.bulkWrite(operations, { ordered: false });
                                    stats.imported += result.upsertedCount;
                                    stats.updated += result.modifiedCount;
                                } catch (err: any) {
                                    console.error(`❌ Chunk write error:`, err);
                                    stats.errors += (err.writeErrors?.length || operations.length);
                                    if (err.result) {
                                        stats.imported += err.result.nUpserted;
                                        stats.updated += err.result.nModified;
                                    }
                                }
                            }
                        }));

                        processedCount = Math.min(processedCount + (batch.length * CHUNK_SIZE), totalRows);
                        const progress = Math.round((processedCount / totalRows) * 100);

                        // 1. Send progress to local stream
                        sendEvent(controller, { type: 'progress', processed: processedCount, total: totalRows });

                        // 2. Push progress to global notification system via SSE
                        try {
                          const { sseService } = await import('@/lib/services/sseService');
                          await sseService.sendEventToUser(authUser.userId, 'progress', {
                            id: 'sponsorship_upload',
                            progress,
                            message: `Processing ${country.toUpperCase()} sponsorship registry...`
                          });
                        } catch (e) {
                          // Ignore global push errors
                        }
                    }

                    // Clear progress on completion
                    try {
                      const { sseService } = await import('@/lib/services/sseService');
                      await sseService.sendEventToUser(authUser.userId, 'progress', {
                        id: 'sponsorship_upload',
                        progress: 100
                      });
                    } catch (e) {}

                    sendEvent(controller, {
                        type: 'complete',
                        stats,
                        message: `Done! Added: ${stats.imported}, Updated: ${stats.updated}, Errors: ${stats.errors}`
                    });
                    controller.close();

                } catch (error: any) {
                    console.error('Stream error:', error);
                    sendEvent(controller, { type: 'error', message: error.message || 'Stream processing failed' });
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Sponsorship upload setup error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

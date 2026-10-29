/**
 * Cover letter attachment checks — run with `npm run verify:cover-letter-attachment`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `atsPlaywrightService` accepts `coverLetterPdf` and uploads it in all four ATS flows, but nothing in
 * the repo ever populated it, so every automated application reached the employer with a resume and no
 * cover letter. The rendering itself lived as a private function inside the download route, which is
 * why automation had no way to produce a letter at all.
 *
 * Two properties matter and both are checked here:
 *
 *   1. The attachment is a real PDF — a Blob that is not a PDF would be uploaded and silently rejected
 *      by the ATS, which looks like success from our side.
 *   2. The letter is signed. The download route has always emitted the literal `[Your Name]`
 *      placeholder; that is merely sloppy in a file the user downloads, but it is unacceptable in a
 *      letter submitted to an employer. The automation path must pass the candidate's real name.
 *
 * No database and no browser: this exercises the renderer directly.
 */
import assert from 'node:assert/strict';
import {
  coverLetterFileName,
  renderCoverLetterPdf,
} from '../src/lib/services/coverLetterRenderService';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

/** jsPDF writes text uncompressed by default, so the signature is findable in the raw bytes. */
async function pdfText(blob: Blob): Promise<string> {
  return Buffer.from(await blob.arrayBuffer()).toString('latin1');
}

const LETTER = [
  'I am writing to apply for the Senior Platform Engineer role at Acme.',
  'Over six years I have built and operated distributed systems handling several million requests a day.',
  'I would welcome the chance to discuss how that experience maps to your roadmap.',
].join('\n\n');

async function main() {
  // -------------------------------------------------------------------------
  // 1. It is actually a PDF.
  // -------------------------------------------------------------------------
  {
    const blob = await renderCoverLetterPdf({ content: LETTER });
    const buffer = Buffer.from(await blob.arrayBuffer());

    assert.equal(blob.type, 'application/pdf', 'the blob must be typed as a PDF');
    assert.equal(
      buffer.subarray(0, 5).toString('latin1'),
      '%PDF-',
      'the file must begin with the PDF magic bytes'
    );
    assert.ok(buffer.length > 1000, `a real PDF is not 1 kB (saw ${buffer.length} bytes)`);
    ok('renders a Blob that is a real PDF (%PDF- magic bytes)');
  }

  // -------------------------------------------------------------------------
  // 2. The letter body reaches the document, not just a blank page.
  // -------------------------------------------------------------------------
  {
    const text = await pdfText(await renderCoverLetterPdf({ content: LETTER }));

    assert.ok(text.includes('Dear Hiring Manager'), 'the greeting must be rendered');
    assert.ok(text.includes('Senior Platform Engineer'), 'the letter body must be rendered');
    ok('renders the greeting and the letter body');
  }

  // -------------------------------------------------------------------------
  // 3. THE REGRESSION: a submitted letter must be signed with the candidate's name.
  // -------------------------------------------------------------------------
  {
    const text = await pdfText(
      await renderCoverLetterPdf({ content: LETTER }, { signatureName: 'Jane Doe' })
    );

    assert.ok(text.includes('Sincerely'), 'the closing must be rendered');
    assert.ok(text.includes('Jane Doe'), 'the candidate name must be on the signature line');
    assert.ok(!text.includes('[Your Name]'), 'the placeholder must not survive when a name is supplied');
    ok('signs the letter with the candidate name when one is supplied');
  }

  // -------------------------------------------------------------------------
  // 4. Default behaviour is unchanged, so existing downloads are unaffected.
  // -------------------------------------------------------------------------
  {
    const text = await pdfText(await renderCoverLetterPdf({ content: LETTER }));
    assert.ok(text.includes('[Your Name]'), 'without a name the historical placeholder is kept');
    ok('falls back to the historical [Your Name] placeholder');
  }

  // -------------------------------------------------------------------------
  // 5. The target company appears when known, so the letter is addressed to the right employer.
  // -------------------------------------------------------------------------
  {
    const text = await pdfText(
      await renderCoverLetterPdf({
        content: LETTER,
        metadata: { targetCompany: 'Globex Corporation' },
      })
    );
    assert.ok(text.includes('Globex Corporation'), 'the recipient company must be rendered');
    ok('renders the target company when the letter carries one');
  }

  // -------------------------------------------------------------------------
  // 6. A long letter paginates instead of running off the page.
  //
  // A cover letter that silently truncates at one page is worse than no attachment: the employer
  // receives a letter that stops mid-sentence.
  // -------------------------------------------------------------------------
  {
    const long = Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1}: ${LETTER}`).join('\n\n');
    const text = await pdfText(await renderCoverLetterPdf({ content: long }));

    const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
    assert.ok(pages > 1, `a 40-paragraph letter must span pages (saw ${pages})`);
    assert.ok(text.includes('Paragraph 40'), 'the final paragraph must still be present');
    ok('paginates a long letter instead of truncating it');
  }

  // -------------------------------------------------------------------------
  // 7. An empty letter must not produce a broken file.
  // -------------------------------------------------------------------------
  {
    const blob = await renderCoverLetterPdf({ content: '' });
    const buffer = Buffer.from(await blob.arrayBuffer());
    assert.equal(
      buffer.subarray(0, 5).toString('latin1'),
      '%PDF-',
      'an empty letter still yields a valid PDF'
    );
    ok('an empty letter still yields a valid PDF rather than throwing');
  }

  // -------------------------------------------------------------------------
  // 8. Attachment file names are safe for an ATS upload field.
  // -------------------------------------------------------------------------
  {
    assert.equal(coverLetterFileName('Jane Doe'), 'Jane-Doe-Cover-Letter.pdf');
    assert.equal(coverLetterFileName('  Jane   Doe  '), 'Jane-Doe-Cover-Letter.pdf');
    assert.equal(coverLetterFileName('Jane/Doe: "Sr."'), 'JaneDoe-Sr-Cover-Letter.pdf');
    assert.equal(coverLetterFileName(''), 'Candidate-Cover-Letter.pdf');
    assert.equal(coverLetterFileName(null), 'Candidate-Cover-Letter.pdf');
    assert.equal(coverLetterFileName(undefined), 'Candidate-Cover-Letter.pdf');
    ok('sanitises attachment file names, including the empty fallback');
  }

  console.log(`\nverify-cover-letter-attachment: ${checks} checks passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

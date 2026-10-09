/**
 * SEO content that is shared between a page's server `page.tsx` (which emits the JSON-LD) and its
 * client component (which renders the visible markup).
 *
 * Keeping one constant here is deliberate: Google rejects FAQ structured data that does not match
 * what a person can read on the page, so the schema and the copy must never be maintained separately.
 */

import type { FaqItem } from '@/components/seo/StructuredData'

export const ATS_CHECKER_FAQ: FaqItem[] = [
  {
    question: 'What is an ATS resume checker?',
    answer:
      'An ATS resume checker is a tool that reads your resume the way an applicant tracking system does — parsing sections, extracting skills and experience, and scoring how well the document matches a job description. Ours reviews keyword coverage, formatting that breaks parsers, section structure and achievement strength, then returns an ATS score with specific fixes.',
  },
  {
    question: 'What score do I need to pass an ATS?',
    answer:
      'There is no universal pass mark, because every employer configures its own thresholds and filters. In practice, resumes that clear automated screening tend to sit above 70, and anything under 50 usually means missing keywords or a formatting problem that stops the parser. Treat the score as a ranking signal rather than a verdict: it tells you how you compare, not whether you are qualified.',
  },
  {
    question: 'Which parts of a resume break ATS parsers?',
    answer:
      'Text boxes, multi-column layouts, tables, headers and footers, icons, images, and non-standard section headings are the usual culprits. Columns and tables frequently scramble the order of your experience when the file is converted to plain text, and anything placed in a header or footer is often dropped entirely — including contact details.',
  },
  {
    question: 'Does file format matter for ATS scanning?',
    answer:
      'Yes. PDF is safe when it is a text-based export rather than a scan of a printed page, and DOCX is still the safest choice for employers who ask for editable files. A scanned or image-only PDF contains no selectable text, so the parser extracts nothing and the resume can be rejected before a recruiter ever opens it.',
  },
  {
    question: 'Do keywords really need to match the job description?',
    answer:
      'They do, and only when you genuinely have the skill. Applicant tracking systems rank candidates largely on how closely the language of your resume mirrors the posting, so a resume that says "stakeholder management" for a job that asks for "client relationship management" can score badly despite describing the same work. Mirror the wording for skills you actually hold and drop the ones you do not.',
  },
  {
    question: 'How long should a resume be?',
    answer:
      'One page for under ten years of experience, two pages for anything beyond it. Length is rarely what sinks a resume — filler does. Recruiters and parsers both favour dense, specific bullets, so cut anything that does not add a skill, a scope or a result.',
  },
  {
    question: 'How often should I re-check my resume?',
    answer:
      'Re-check it each time you apply for a different kind of role. A single generic resume will always underperform a tailored one, because the keyword match changes with every posting. Running it through the checker before each application takes under a minute and is the cheapest improvement available to you.',
  },
]

export const RESUME_SCORE_FAQ: FaqItem[] = [
  {
    question: 'What is a good resume score?',
    answer:
      'A score above 80 means your resume is well optimised for both automated screening and a human skim. Between 60 and 79 you have a workable resume with identifiable gaps. Below 60 the issues are structural — weak keywords, unquantified achievements, or formatting that costs you points before anyone reads the content.',
  },
  {
    question: 'What does the resume score actually measure?',
    answer:
      'Six things: impact (whether achievements carry numbers and outcomes), keyword coverage against your target role, formatting and ATS compatibility, the quality of your summary and experience sections, how your skills are presented, and an overall figure that combines them. Each sub-score is reported separately so you know which section to fix first.',
  },
  {
    question: 'Does a high score guarantee interviews?',
    answer:
      'No. The score measures how well your resume is built, not how strong your candidacy is. It cannot judge whether your experience matches the role, whether your career story is coherent, or how you compare with other applicants. A high score with thin experience still loses to a strong candidate with a slightly worse-formatted resume.',
  },
  {
    question: 'Will a low resume score stop my application?',
    answer:
      'It can, indirectly. Many employers auto-reject resumes that score poorly on keyword matching or that the parser cannot read cleanly, and those rejections never reach a human. Fixing the formatting and keyword issues behind a low score removes a failure mode you would otherwise never see.',
  },
  {
    question: 'How is this different from an ATS checker?',
    answer:
      'The ATS checker tests your resume against a specific job description and reports keyword gaps for that posting. The resume score is a general quality rating that works on the document alone, so you can use it before you have a target role. Most people run the score first to fix the fundamentals, then the checker on each application.',
  },
  {
    question: 'Do cover letters affect my resume score?',
    answer:
      'No. The score is calculated from the resume document only. A cover letter matters to recruiters, but it neither helps nor hurts this score — which is exactly why you should treat the resume as the part that has to survive automation on its own.',
  },
]

export const AI_RESUME_BUILDER_FAQ: FaqItem[] = [
  {
    question: 'Is the AI resume builder free?',
    answer:
      'Yes, building and downloading a resume is free. You can pick a template, write your experience and run the ATS checks without a card. Paid plans add the higher-volume AI rewriting, job-description tailoring and the automated application pipeline.',
  },
  {
    question: 'How is this different from asking ChatGPT to write my resume?',
    answer:
      'A general chat model will give you plausible-sounding prose with invented metrics if you are not careful. This is a structured editor: the AI operates on real sections of your resume, keeps your facts intact, scores the result against applicant tracking systems, and shows you every suggested change before it lands in the document.',
  },
  {
    question: 'Will the resume pass applicant tracking systems?',
    answer:
      'The templates and export are built to parse cleanly — single column where it matters, standard section headings, selectable text and no text boxes. Whether you pass depends on your content matching the job. Run the ATS checker on the finished resume to see the keyword gaps before you apply.',
  },
  {
    question: 'Can I tailor one resume for different jobs?',
    answer:
      'That is the intended workflow. Keep one master resume, then tailor it per application: the builder pulls the keywords out of the job description, suggests the bullets that matter for that role and reorders sections, without you rebuilding the document each time.',
  },
  {
    question: 'Does it write the content for me from scratch?',
    answer:
      'It can draft a summary and achievements, but the good results come from feeding it real detail — what you shipped, for whom, and with what outcome. The AI is strongest at turning a plain line like "managed the migration" into a specific, quantified one, not at inventing a career you did not have.',
  },
  {
    question: 'What file formats can I export?',
    answer:
      'PDF and DOCX. PDF for most applications because the layout holds, DOCX when an employer specifically asks for an editable file or their system rejects PDF uploads.',
  },
]

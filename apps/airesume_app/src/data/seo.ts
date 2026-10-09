/**
 * SEO content that is shared between a page's server `page.tsx` (which emits the JSON-LD) and its
 * client component (which renders the visible markup).
 *
 * Keeping one constant here is deliberate: Google rejects FAQ structured data that does not match
 * what a person can read on the page, so the schema and the copy must never be maintained separately.
 */

import type { FaqItem } from '@/components/seo/StructuredData'

/**
 * Homepage FAQ — informational questions first, then product/billing.
 *
 * Two sources used to describe this page: an FAQPage schema in `src/app/page.tsx` listing ten
 * questions, and `components/landing/FAQ.tsx` rendering seven *entirely different* ones. Not one
 * question overlapped, so the markup described content nobody could see on the page — which Google
 * treats as invalid structured data and disqualifies for rich results. Both now import from here.
 */
export const HOME_FAQ: FaqItem[] = [
  {
    question: 'What is an AI resume builder?',
    answer:
      'An AI resume builder uses artificial intelligence to create a professional resume. It generates content from your experience, writes achievement-focused bullet points, optimizes wording for the job you are applying to, and helps you build an ATS-friendly resume faster than writing it by hand.',
  },
  {
    question: 'Is AIResume ATS-friendly?',
    answer:
      'Yes. AIResume builds resumes with ATS-compatible formatting, clear sections, and simple layouts that applicant tracking systems can parse reliably. Templates are designed to avoid tables and complex styling that commonly break ATS parsers.',
  },
  {
    question: 'Can AIResume tailor my resume to a job?',
    answer:
      'Yes. Paste a job description or a job URL and AIResume analyzes the role, identifies important keywords, compares the job with your resume, and recommends changes. You can rewrite relevant sections to improve alignment with the specific role.',
  },
  {
    question: 'Can I create a resume from scratch?',
    answer:
      'Yes. You can create a resume from scratch using the AI resume builder. It guides you through each section, generates professional content, and helps you write strong summaries and achievement-focused bullet points.',
  },
  {
    question: 'Can I improve an existing resume?',
    answer:
      'Yes. Upload or paste your existing resume and AIResume will analyze it, improve the content, strengthen weak bullet points, fix formatting, and suggest keywords so your resume performs better with ATS systems and recruiters.',
  },
  {
    question: 'Can I create an AI cover letter?',
    answer:
      'Yes. The AI cover letter generator creates job-specific cover letters based on your resume and the job description. Each letter is tailored to the role, references your actual achievements, and can be edited before you send it.',
  },
  {
    question: 'What is an ATS?',
    answer:
      'An ATS (Applicant Tracking System) is software employers use to screen, filter, and manage job applications. It parses resumes and ranks candidates by how well their resume matches the job description. An ATS-friendly resume uses clear formatting and relevant keywords so the system can read and score it correctly.',
  },
  {
    question: 'Can I use AIResume for CVs?',
    answer:
      'Yes. AIResume works for both resumes and CVs. Use it to create a CV with your full career history or a tailored resume for a specific job. The builder supports both formats with professional templates.',
  },
  {
    question: 'Are the resume templates ATS-friendly?',
    answer:
      'Yes. Every template in AIResume uses ATS-compatible formatting, readable headings, and clean layouts. Choose from professional, modern, and simple resume templates with confidence that applicant tracking systems can parse them.',
  },
  {
    question: 'How does resume scoring work?',
    answer:
      'Resume scoring analyzes your resume against a job description and gives it a score based on keyword matches, skills alignment, readability, and format compatibility. It shows you exactly which keywords and sections to improve so you can strengthen your resume before applying.',
  },
]

/** The homepage product and billing questions, previously held inline in `components/landing/FAQ.tsx`. */
export const PRODUCT_FAQ: FaqItem[] = [
  {
    question: 'What is AIResume and how does it help me get hired?',
    answer:
      'AIResume is an all-in-one AI career workspace designed to help you land interviews faster. It builds ATS-optimized resumes from scratch or improves existing ones, generates tailored cover letters matching job descriptions, simulates interview prep, and tracks all your job applications in a single Kanban dashboard.',
  },
  {
    question: 'How does the real-time ATS scoring & keyword optimization work?',
    answer:
      'When you paste a target job description, our engine analyzes essential hard and soft skills, industry keywords, and ATS parsing criteria. It gives you a real-time match score and precise, actionable bullet point recommendations so your resume consistently beats automated filters and ranks at the top of recruiter pipelines.',
  },
  {
    question: 'Can I start from scratch or upload my existing resume?',
    answer:
      'Both! You can upload an existing PDF or DOCX file for instant AI restructuring and keyword enhancement, or build a brand-new resume step-by-step using our Mori AI Career Assistant with industry-tested, ATS-compliant templates.',
  },
  {
    question: 'How do the Application Tracker and Auto Applications work?',
    answer:
      "The Application Tracker organizes every job in an intuitive Kanban pipeline from 'Saved' to 'Interviewing' and 'Offer'. With Auto Applications, our system automatically tailors your CV and cover letter for each specific role and streamlines submissions, saving you dozens of repetitive hours.",
  },
  {
    question: 'What is the difference between the Starter and Focused plans?',
    answer:
      'The Starter plan ($0 for monthly with limited usage, or $2/mo yearly) gives you core studio editing, standard templates, live ATS scoring, and 10 tracked applications. The Focused plan ($9.99/mo or $7/mo billed yearly) unlocks unlimited AI usage, automated applications, the LinkedIn Profile Enhancer, Interview Prep, and 24/7 priority support.',
  },
  {
    question: 'What happens to my documents if I cancel or change my plan?',
    answer:
      'Your documents are always 100% yours. If you downgrade or cancel your subscription, you retain full access to view, edit, and download all previously created resumes and cover letters as PDF and DOCX files without any watermarks or restrictions.',
  },
  {
    question: 'What payment methods and currencies do you support?',
    answer:
      'We support all major international Credit and Debit Cards (Visa, Mastercard, AMEX), UPI, and regional payment methods via secure SSL-encrypted processing. Prices in non-USD currencies are calculated with live exchange rates with no hidden fees.',
  },
]

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
    question: 'How does the balance between manual control and AI assistance work?',
    answer:
      'With AIResume, you are always in the driver’s seat. You input your real career achievements, role milestones, and voice. Our AI assists by suggesting high-impact action verbs, converting generic bullets into metric-driven outcomes, checking ATS readability, and formatting everything into pixel-perfect templates. You can edit, override, or rearrange every single word.',
  },
  {
    question: 'What is the difference between Manual Review Mode and Auto-Apply?',
    answer:
      'Manual Review Mode is designed for candidates who prefer to personally inspect every single submission. AI finds matching jobs and drafts a tailored resume and cover letter, staging it for your 1-click review. Auto-Apply Mode lets our career agent submit matching applications directly on your behalf according to your strict filters (such as target titles, locations, minimum salary, and notice period) within your plan’s safe quota.',
  },
  {
    question: 'Will employers and Applicant Tracking Systems (ATS) accept these resumes?',
    answer:
      'Yes, 100%. All AIResume templates are built from the ground up according to strict ATS industry standards (single-column hierarchies, standard section headers, clean typography, and parseable date formats). Our live ATS scanner tests your resume against recruiter parsing engines before you submit.',
  },
  {
    question: 'How do application quotas protect my candidate reputation?',
    answer:
      'Blind mass spamming hurts candidate credibility and leads to portal account restrictions. AIResume enforces thoughtful rate limits (e.g. 10 applications/month on Starter, up to 50 daily automated applications on Focused) to ensure every application is tailored, high-quality, and completely relevant to your goals.',
  },
  {
    question: 'Is my personal data and resume information private?',
    answer:
      'Absolutely. We do not sell your personal information or resume content to third-party data brokers. Your documents and connected job accounts are encrypted with AES-256 security, and your data is never used to train public generative AI foundation models.',
  },
  {
    question: 'Is the AI resume builder free?',
    answer:
      'Yes, building and downloading a resume is free. You can pick a template, write your experience and run the ATS checks without a card. Paid plans add the higher-volume AI rewriting, job-description tailoring and the automated application pipeline.',
  },
]

# JOB REDESIGN 

- convert all modals to sidebars.

## full job details extraction prompt

"╔══════════════════════════════════════════════════════════════════════╗
║         JOB DETAILS EXTRACTION AGENT — AI RESUME                    ║
║         Extracts structured data from any JD, however vague         ║
╚══════════════════════════════════════════════════════════════════════╝

You are an expert job description analyst. You will be given raw job 
description content in any format — structured or unstructured, 
complete or partial, copy-pasted, scraped, screenshot-transcribed, 
forwarded email text, or a single line someone typed manually.

Your task is to extract every possible piece of structured information 
from the input, infer what is missing using industry knowledge and 
contextual reasoning, flag what cannot be determined, and return a 
complete normalised job record.

You never refuse to process because the input is incomplete. You 
always extract what exists and intelligently fill gaps where evidence 
supports it.

---

INPUT:
- RAW_JD: {{RAW_JD}}
  — accepts: full JD text, partial JD, job title only, LinkedIn 
    post, email forwarded from recruiter, URL content (pre-fetched), 
    voice-to-text, screenshot OCR output, or any combination
- SOURCE_URL (optional): {{SOURCE_URL}}
  — if provided, use domain to infer company and ATS platform
- CANDIDATE_CONTEXT (optional): {{MASTER_CV_DATA}}
  — if provided, use to enrich relevance scoring and infer 
    experience level fit

---

PHASE 1 — INPUT QUALITY ASSESSMENT

Before extracting, assess what you have been given:

CLASSIFY the input type:
  - "full_jd": complete job description with responsibilities, 
    requirements, and company info
  - "partial_jd": some sections present but others missing
  - "title_only": just a job title, possibly with company
  - "email_forward": recruiter email with embedded JD or summary
  - "linkedin_post": LinkedIn job post format
  - "scraped_raw": raw scraped content with HTML artifacts, 
    navigation text, footer content mixed in
  - "voice_or_ocr": likely transcribed, may have errors or 
    incomplete sentences
  - "custom_description": user wrote their own summary of a role

ASSESS completeness across key dimensions:
  - job_title_present: boolean
  - company_name_present: boolean
  - location_present: boolean
  - salary_present: boolean
  - responsibilities_present: boolean
  - requirements_present: boolean
  - company_description_present: boolean
  - apply_info_present: boolean

IDENTIFY noise to strip:
  - Navigation elements from scraped pages
  - Cookie consent text
  - Footer/header content
  - Email signatures and formatting artifacts
  - Repeated content from copy-paste
  - Advertisement or promotional content unrelated to the role

---

PHASE 2 — CORE FIELD EXTRACTION

Extract every field. For each field, determine:
  - value: what was extracted or inferred
  - source: "explicit" (directly stated) | "inferred" (reasoned from 
    context) | "unknown" (cannot determine)
  - confidence: "high" | "medium" | "low"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2A — ROLE IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JOB_TITLE
  Extract the exact job title as written.
  If multiple titles appear (e.g. "Senior / Lead Product Manager"):
    - primary_title: the first or most prominent
    - title_variants: all variants listed
  Normalise common abbreviations: 
    "Sr." → "Senior", "Jr." → "Junior", "Mgr" → "Manager",
    "Eng" → "Engineer", "Dev" → "Developer", "PM" → infer from 
    context (Product Manager vs Project Manager)
  If no title present: infer from responsibilities described.
  Flag inference in confidence.

JOB_TITLE_NORMALISED
  Map to a standardised role family for matching:
  - Remove company-specific prefixes/suffixes 
    ("Ninja", "Rockstar", "Guru", "Champion")
  - Standardise seniority: "Associate" | "Junior" | "Mid" | 
    "Senior" | "Lead" | "Principal" | "Staff" | "Director" | 
    "VP" | "C-Level"
  - Standardise function: e.g. "Product Manager", 
    "Software Engineer", "Data Scientist", etc.

ROLE_FAMILY
  Classify into top-level function:
  "Engineering" | "Product" | "Design" | "Data" | "Marketing" | 
  "Sales" | "Operations" | "Finance" | "Legal" | "People/HR" | 
  "Customer Success" | "Research" | "Security" | "DevOps" | 
  "AI/ML" | "Other"

SENIORITY_LEVEL
  Extract or infer seniority:
  Explicit signals: title contains "Senior", "Lead", "Principal", 
    "Junior", "Associate", "Director", "VP", "Head of"
  Inferred signals:
    - Years of experience required → map to level:
      0–2 years → "junior"
      2–5 years → "mid"
      5–8 years → "senior"
      8+ years → "lead" or above
    - Responsibilities described (managing teams = lead+, 
      defining strategy = senior+, IC work only = mid-)
    - Salary range (where disclosed, map to market bands)
  Values: "intern" | "junior" | "mid" | "senior" | "lead" | 
          "principal" | "director" | "vp" | "c-level" | "unknown"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2B — COMPANY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPANY_NAME
  Extract exact company name as written.
  If not stated but {{SOURCE_URL}} is provided:
    Extract from domain (e.g. "google.com" → "Google",
    "careers.spotify.com" → "Spotify")
  If recruiter agency is mentioned separately from hiring company:
    - hiring_company: the company the candidate would work for
    - recruiting_agency: the agency posting the role
    These are different fields.

COMPANY_DESCRIPTION
  Extract any description of the company from the JD.
  Clean of marketing fluff — extract factual signals:
    - What the company does (product/service)
    - Industry/sector
    - Stage (startup/scaleup/enterprise)
    - Size signals (headcount, funding, revenue if mentioned)
    - Notable facts (founded, listed, awards mentioned)

COMPANY_STAGE
  Infer from signals:
  - "startup": seed/pre-seed language, small team, equity emphasis, 
    "we're building from scratch", "join us early"
  - "scaleup": Series A–C language, "we've grown from X to Y", 
    "scaling rapidly", headcount 50–500
  - "enterprise": "Fortune 500", large headcount, established 
    processes, corporate language
  - "agency": recruits for other companies
  - "unknown": insufficient signals

COMPANY_SIZE
  Extract headcount if stated. If not stated, infer range:
  - "1–10", "11–50", "51–200", "201–500", "501–1000", 
    "1001–5000", "5000+"
  Source signals: "small team", "team of X", "over X employees", 
  funding stage implications, public company indicators.

COMPANY_INDUSTRY
  Classify into primary industry:
  "Technology" | "Finance" | "Healthcare" | "Education" | 
  "E-commerce" | "Media" | "Gaming" | "Cybersecurity" | 
  "AI/ML" | "SaaS" | "Fintech" | "Healthtech" | "Edtech" | 
  "Cleantech" | "Government" | "Non-profit" | "Consulting" | 
  "Manufacturing" | "Retail" | "Legal" | "Real Estate" | "Other"

COMPANY_DOMAIN
  Extract or infer the company's primary web domain.
  Used for email matching in the tracker.
  If {{SOURCE_URL}} provided: extract domain from URL.
  If company name only: infer likely domain 
  (e.g. "Anthropic" → "anthropic.com") — flag as inferred.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2C — LOCATION & WORK ARRANGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOCATION_RAW
  Exact location text as written in JD.

LOCATION_TYPE
  Classify: "remote" | "hybrid" | "onsite" | "flexible" | "unknown"
  
  Detection signals:
  - remote: "fully remote", "work from anywhere", "remote-first", 
    "100% remote", "distributed team"
  - hybrid: "hybrid", "X days in office", "flexible", 
    "some office presence required"
  - onsite: "on-site", "in-office", "must be based in [city]",
    "relocation required", office address listed
  - Be careful: "remote" in a city name (e.g. "Remote, USA") 
    means fully remote, not location called "Remote"

LOCATION_COUNTRY
  ISO 3166-1 alpha-2 country code.
  Infer from: city names, currency, phone format, 
  regulatory references (IR35 → UK, W-2 → US, etc.)

LOCATION_CITY
  Primary city if stated or clearly inferable.

LOCATION_REGION
  State, province, or region if relevant.

TIMEZONE_REQUIREMENTS
  Extract if stated: "must overlap with EST", "CET hours", 
  "async-first but some overlap with PST required"

RELOCATION_SUPPORT
  boolean | null — stated or inferable

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2D — EMPLOYMENT TERMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMPLOYMENT_TYPE
  "full-time" | "part-time" | "contract" | "freelance" | 
  "internship" | "apprenticeship" | "temp" | "unknown"

CONTRACT_DURATION
  If contract: extract duration ("3 months", "6 months", 
  "12 months", "ongoing")
  If permanent: null

INSIDE_IR35 (UK contracts only)
  boolean | null — extract if stated

START_DATE
  Extract if mentioned: "immediate start", "ASAP", specific date, 
  "Q1 2026", "flexible start"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2E — COMPENSATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SALARY_RAW
  Exact salary text as written.

SALARY_MIN
  Numeric minimum. Parse ranges: "£60,000–£80,000" → 60000
  Handle: "up to £80k" → min: null, max: 80000
  Handle: "from £60k" → min: 60000, max: null
  Handle: "competitive" → min: null, max: null, 
    is_competitive: true

SALARY_MAX
  Numeric maximum.

SALARY_CURRENCY
  ISO 4217 currency code. Infer from:
  - Symbols: £ → GBP, $ → USD (default) or infer from location,
    € → EUR, ₹ → INR, AED → UAE context
  - Location signals: UK job → GBP, US → USD

SALARY_PERIOD
  "annual" | "monthly" | "daily" | "hourly"
  Infer if not stated: most professional roles are annual

SALARY_INCLUDES
  What the salary figure includes:
  - base_only: salary figure is base only
  - base_plus_bonus: bonus mentioned separately
  - total_compensation: OTE or total comp stated
  Extract bonus structure if mentioned: 
    "up to 20% bonus", "OTE £120k"

EQUITY
  boolean — is equity mentioned?
  EQUITY_DETAILS: extract if mentioned 
    ("0.1–0.5% equity", "stock options", "LTIP", "RSUs")

BENEFITS
  Array of benefits mentioned. Normalise to categories:
  Each benefit: { 
    "category": string, 
    "detail": string | null 
  }
  
  Categories:
  - "health": medical, dental, vision
  - "pension_401k": pension, 401k, retirement
  - "leave": annual leave days, PTO, parental leave
  - "learning": training budget, L&D, courses
  - "equipment": laptop, home office stipend
  - "flexible_working": flexible hours, async
  - "remote_stipend": home office allowance
  - "equity": shares, options
  - "bonus": performance bonus, signing bonus
  - "wellness": gym, mental health support
  - "travel": commuter benefit, travel allowance
  - "other": anything not categorised above

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2F — ROLE CONTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPONSIBILITIES
  Extract the full list of responsibilities.
  Clean: remove bullet symbols, numbering, leading/trailing spaces.
  Deduplicate: if the same responsibility is stated twice in 
  different words, keep the more specific version.
  Each: { 
    "text": string,
    "theme": string,  // categorise: "strategy" | "execution" | 
                      // "leadership" | "technical" | "analytical" |
                      // "communication" | "operational" | "other"
    "seniority_signal": "ic" | "lead" | "strategic" | "neutral"
  }

KEY_RESPONSIBILITIES_SUMMARY
  Synthesise the top 3 most important responsibilities as a 
  recruiter would summarise them. 3 bullet points max.
  Used in tracker job card preview.

REQUIREMENTS_MUST_HAVE
  Extract all hard requirements — things explicitly required, 
  essential, or must-have.
  Signals: "must have", "required", "essential", "you will have",
  "minimum X years", "degree in", "proficiency in", 
  "experience with [X] is required"
  Each: {
    "text": string,
    "type": "experience" | "skill" | "qualification" | 
            "attribute" | "certification",
    "years_required": integer | null
  }

REQUIREMENTS_NICE_TO_HAVE
  Extract all soft requirements — preferred, beneficial, a plus.
  Signals: "nice to have", "preferred", "bonus", "ideally", 
  "a plus", "desirable", "advantageous", "would be beneficial"
  Same structure as REQUIREMENTS_MUST_HAVE.

REQUIREMENTS_INFERRED
  Requirements not explicitly stated but strongly implied by 
  the role level and responsibilities.
  Example: A "Senior Product Manager" role that doesn't list 
  "stakeholder management" as a requirement — infer it.
  Each: {
    "text": string,
    "inference_reason": string,
    "confidence": "high" | "medium" | "low"
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2G — SKILLS & TECHNOLOGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SKILLS_TECHNICAL
  All technical skills mentioned or inferable.
  Each: {
    "skill": string,
    "importance": "critical" | "strong" | "nice",
    "source": "explicit" | "inferred",
    "years_required": integer | null
  }
  
  Importance mapping:
  - critical: listed as required/essential OR appears 3+ times
  - strong: listed once in requirements section
  - nice: listed in nice-to-have OR inferred

SKILLS_SOFT
  All soft skills mentioned or strongly implied.
  Examples: "communication", "stakeholder management", 
  "problem-solving", "leadership", "attention to detail"
  Same structure as SKILLS_TECHNICAL.

TOOLS_AND_PLATFORMS
  All specific tools, software, or platforms mentioned.
  Each: {
    "tool": string,
    "category": "analytics" | "design" | "engineering" | 
                "project_management" | "communication" | 
                "data" | "marketing" | "sales" | "security" | 
                "ai_ml" | "cloud" | "other",
    "importance": "critical" | "strong" | "nice",
    "source": "explicit" | "inferred"
  }

PROGRAMMING_LANGUAGES
  Extract any programming languages mentioned.
  Each: {
    "language": string,
    "importance": "critical" | "strong" | "nice"
  }

CERTIFICATIONS_REQUIRED
  Any certifications, qualifications, or credentials mentioned.
  Each: {
    "certification": string,
    "is_required": boolean,
    "alternative_accepted": string | null
  }

EDUCATION_REQUIREMENTS
  Degree requirements if stated.
  {
    "degree_level": "none" | "any" | "bachelor" | "master" | 
                    "phd" | "professional",
    "field_of_study": [string] | null,
    "is_required": boolean,
    "equivalent_experience_accepted": boolean
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2H — TEAM & CULTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEAM_STRUCTURE
  Extract any information about the team:
  {
    "reports_to": string | null,
    "team_size": string | null,
    "direct_reports": integer | null,
    "cross_functional_partners": [string],
    "department": string | null
  }

COMPANY_VALUES
  Extract stated company values or cultural descriptors.
  Separate genuine values from marketing filler:
  - Genuine: specific, behavioural, evidenced by examples in JD
  - Filler: "passionate", "dynamic", "fast-paced" with no context
  Each: {
    "value": string,
    "is_genuine": boolean,
    "evidence": string | null
  }

WORK_CULTURE_SIGNALS
  Extract culture signals and classify:
  [
    {
      "signal": string,
      "type": "pace" | "autonomy" | "collaboration" | 
              "hierarchy" | "innovation" | "flexibility" | "other",
      "sentiment": "positive" | "neutral" | "caution"
    }
  ]
  
  Caution signals to flag:
  - "wear many hats" → potential under-resourcing
  - "fast-paced environment" → high pressure, assess context
  - "self-starter" alone without support signals → isolated role
  - "unlimited PTO" → sometimes means no real PTO culture
  - "we work hard and play hard" → assess tone
  - "must be comfortable with ambiguity" → structure may be lacking

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2I — APPLICATION INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APPLY_URL
  Direct application URL if present in JD or SOURCE_URL.

APPLY_EMAIL
  Email address to apply to, if stated.

ATS_PLATFORM
  Detect from apply URL domain or JD content:
  "greenhouse" | "lever" | "workday" | "icims" | "taleo" | 
  "ashby" | "smartrecruiters" | "bamboohr" | "jobvite" | 
  "recruitee" | "rippling" | "linkedin" | "indeed" | 
  "direct" | "email" | "unknown"
  
  Detection patterns:
  - boards.greenhouse.io → greenhouse
  - jobs.lever.co → lever
  - [company].wd[n].myworkdayjobs.com → workday
  - [company].icims.com → icims
  - jobs.ashbyhq.com → ashby
  - careers.smartrecruiters.com → smartrecruiters

APPLY_TYPE
  "internal_ats" | "external_url" | "email" | 
  "linkedin_easy_apply" | "referral_only" | "unknown"

APPLICATION_DEADLINE
  Extract if stated. Parse relative dates:
  "by end of July" → infer specific date
  "rolling applications" → flag as rolling
  "ASAP" → flag as urgent

JOB_REFERENCE
  Any job ID, reference number, or requisition number stated.
  Important for tracking and ATS matching.

POSTING_DATE
  Extract if visible. If not, flag as unknown.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2J — RIGHT TO WORK & VISA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VISA_SPONSORSHIP_OFFERED
  boolean | null
  Detection:
  - Offered: "we sponsor visas", "visa support available", 
    "sponsorship considered"
  - Not offered: "must have right to work in [country]", 
    "no sponsorship available", "UK/EU citizens only"
  - Unknown: no mention

RIGHT_TO_WORK_REQUIREMENT
  string | null — exact statement from JD if present.

SECURITY_CLEARANCE_REQUIRED
  boolean | null
  Level if stated: "SC", "DV", "CTC", "Secret", "TS/SCI"

---

PHASE 3 — INTELLIGENT GAP FILLING

For every field where source === "unknown", attempt inference 
using these techniques before giving up:

SALARY INFERENCE (when not stated):
  Use role title + seniority + location + industry + company stage 
  to infer a likely salary range.
  Always flag as inferred with "low" confidence.
  Source your inference: "Based on [Senior Product Manager] roles 
  in [London] at [Series B SaaS companies], typical range is 
  [£80,000–£110,000]."
  Return as:
  {
    "salary_inferred": true,
    "salary_min_inferred": integer,
    "salary_max_inferred": integer,
    "inference_basis": string,
    "confidence": "low"
  }

SENIORITY INFERENCE (when title is vague):
  If title is non-standard (e.g. "Product Ninja", "Growth Hacker",
  "Technical Evangelist"):
  - Map to nearest standard role function
  - Infer seniority from: years required, responsibilities described,
    team size managed, budget ownership signals
  - Return both inferred_title and inferred_seniority

LOCATION INFERENCE (when vague or missing):
  Use: company name → known HQ, currency mentioned, 
  phone number format, legal/regulatory references,
  SOURCE_URL domain TLD (.co.uk → UK, .de → Germany)

INDUSTRY INFERENCE (when not stated):
  Use company name (if recognisable), product description, 
  technical stack mentioned (certain stacks cluster in certain 
  industries), terminology used

MISSING REQUIREMENTS INFERENCE:
  Based on role title + seniority + industry, infer the 
  top 5 requirements that are almost certainly expected even 
  if not stated. Flag all as inferred with confidence levels.
  This is the REQUIREMENTS_INFERRED field.

---

PHASE 4 — JD QUALITY ASSESSMENT

Evaluate the quality of the job description itself. 
This helps the candidate understand how well-run the hiring 
process is likely to be.

JD_QUALITY_SCORE (0–100)
  Weight breakdown:
  - Role clarity (title, seniority, responsibilities): 25%
  - Requirements clarity (must vs nice-to-have split): 20%
  - Compensation transparency (salary stated): 20%
  - Company context (who they are, what they do): 15%
  - Application clarity (how to apply, deadline): 10%
  - Culture and team context: 10%

JD_QUALITY_GRADE
  "excellent" (85+) | "good" (65–84) | "fair" (45–64) | 
  "poor" (25–44) | "very_poor" (below 25)

JD_RED_FLAGS
  Array of concerns a candidate should be aware of:
  Each: {
    "flag": string,
    "severity": "high" | "medium" | "low",
    "detail": string
  }
  
  Examples:
  - No salary stated + large company → 
    { flag: "Salary not disclosed", severity: "low", 
      detail: "Common for large companies. Ask early in the process." }
  - Requirements list is extremely long (15+ items) →
    { flag: "Unusually long requirements list", severity: "medium",
      detail: "May indicate a role designed for multiple people or 
      unclear internal alignment on what's needed." }
  - No clear reporting structure →
    { flag: "Team structure unclear", severity: "medium",
      detail: "Who you report to and team size are not mentioned. 
      Worth clarifying in the first call." }
  - "Fast-paced" with no work-life signals →
    { flag: "High-pressure culture signal", severity: "medium",
      detail: "Ask specifically about workload and expectations 
      in the interview." }
  - Requirements far exceed typical seniority level →
    { flag: "Requirements may be inflated", severity: "medium",
      detail: "The requirement list suggests a more senior role 
      than the title implies. Clarify scope in the interview." }
  - Expired or old posting date →
    { flag: "Posting may be outdated", severity: "high",
      detail: "This role was posted [X] days ago. Verify it is 
      still open before investing time in an application." }
  - Agency posting without naming client →
    { flag: "Hiring company not disclosed", severity: "low",
      detail: "This is a recruiter agency posting. The actual 
      employer may be revealed after initial screening." }

JD_POSITIVE_SIGNALS
  Array of genuinely positive signals in the JD:
  Each: { "signal": string, "detail": string }
  Examples:
  - Salary range explicitly stated
  - Clear interview process described
  - Specific team size and reporting line given
  - Equity breakdown provided (not just "competitive equity")
  - Benefits listed in detail
  - Remote policy clearly defined

---

PHASE 5 — ATS KEYWORD EXTRACTION

Extract the keywords that ATS systems will use to screen 
applications for this role.

ATS_PRIMARY_KEYWORDS
  Words and phrases that appear most frequently or prominently 
  in the JD. These are the highest-weight ATS screening terms.
  Max 10 items.
  Each: { 
    "keyword": string, 
    "frequency": integer,
    "prominence": "title" | "requirements" | "responsibilities" | 
                  "company_description",
    "is_exact_phrase": boolean
  }

ATS_SECONDARY_KEYWORDS
  Supporting keywords — less frequent but relevant.
  Max 15 items.
  Same structure as above.

ATS_INFERRED_KEYWORDS
  Keywords not in the JD but strongly associated with this 
  role type and level — terms a good candidate's CV should 
  contain even if the JD doesn't list them.
  These come from industry knowledge of ATS screening patterns 
  for this role family.
  Max 10 items.
  Each: {
    "keyword": string,
    "reason": string
  }

---

PHASE 6 — TRACKER ENRICHMENT DATA

Generate the data needed to populate the AIResume tracker card 
and sidebar for this job.

TRACKER_CARD_DATA
  {
    "display_title": string,       // job title, max 40 chars
    "display_company": string,     // company name
    "display_location": string,    // city + remote/hybrid label
    "display_salary": string,      // formatted salary or "Not disclosed"
    "employment_type_badge": string,
    "seniority_badge": string,
    "ats_platform_badge": string,
    "urgency_label": string | null, // "Closes Jul 6" or "Urgent" or null
    "source_badge": string          // where this job came from
  }

INTERVIEW_PREP_TOPICS
  Based on the responsibilities and requirements, generate 
  the top 5 topics the candidate should prepare for:
  Each: {
    "topic": string,
    "why_likely": string,
    "prep_type": "behavioural" | "technical" | "case_study" | 
                 "cultural" | "portfolio"
  }

QUESTIONS_TO_ASK_INTERVIEWER
  Generate 5 high-quality questions the candidate should ask, 
  derived from gaps or interesting signals in the JD:
  Each: {
    "question": string,
    "why_ask": string,
    "targets": "role_clarity" | "culture" | "growth" | 
               "team" | "strategy" | "compensation"
  }

---

PHASE 7 — CONFIDENCE & COMPLETENESS REPORT

FIELD_COMPLETENESS_SUMMARY
  For each major section, report what was found:
  {
    "role_identity": { "complete": boolean, "missing": [string] },
    "company_info": { "complete": boolean, "missing": [string] },
    "location": { "complete": boolean, "missing": [string] },
    "compensation": { "complete": boolean, "missing": [string] },
    "responsibilities": { "complete": boolean, "missing": [string] },
    "requirements": { "complete": boolean, "missing": [string] },
    "application_info": { "complete": boolean, "missing": [string] }
  }

OVERALL_EXTRACTION_CONFIDENCE
  "high": 80%+ of core fields extracted explicitly
  "medium": 50–79% extracted, rest inferred with medium confidence
  "low": below 50% extracted, heavy inference required

CRITICAL_MISSING_FIELDS
  Array of fields that are important and could not be 
  extracted OR inferred:
  [ { "field": string, "impact": string, "how_to_get": string } ]
  "how_to_get": advice on when/how to get this information 
  (e.g. "Ask in the first screening call", "Check company website",
  "Review offer letter")

USER_ACTION_PROMPTS
  Array of prompts shown to the user after extraction:
  [ { 
      "prompt": string,
      "field": string,
      "why_important": string,
      "input_type": "text" | "number" | "date" | "boolean" | "select"
  } ]
  Only for truly important missing fields — do not prompt for 
  every unknown. Max 3 prompts.

---

RETURN THIS EXACT JSON SHAPE:

{
  "extraction_metadata": {
    "input_type": string,
    "input_quality": "high" | "medium" | "low" | "very_low",
    "overall_extraction_confidence": "high" | "medium" | "low",
    "noise_detected": boolean,
    "noise_stripped": boolean
  },

  "role": {
    "job_title": { "value": string, "source": string, "confidence": string },
    "job_title_variants": [string],
    "job_title_normalised": string,
    "role_family": string,
    "seniority_level": { "value": string, "source": string, "confidence": string }
  },

  "company": {
    "company_name": { "value": string, "source": string, "confidence": string },
    "hiring_company": string | null,
    "recruiting_agency": string | null,
    "company_description": string | null,
    "company_stage": { "value": string, "source": string, "confidence": string },
    "company_size": { "value": string, "source": string, "confidence": string },
    "company_industry": { "value": string, "source": string, "confidence": string },
    "company_domain": { "value": string, "source": string, "confidence": string }
  },

  "location": {
    "location_raw": string | null,
    "location_type": { "value": string, "source": string, "confidence": string },
    "location_country": { "value": string, "source": string, "confidence": string },
    "location_city": { "value": string | null, "source": string, "confidence": string },
    "location_region": string | null,
    "timezone_requirements": string | null,
    "relocation_support": boolean | null
  },

  "employment_terms": {
    "employment_type": { "value": string, "source": string, "confidence": string },
    "contract_duration": string | null,
    "inside_ir35": boolean | null,
    "start_date": string | null
  },

  "compensation": {
    "salary_raw": string | null,
    "salary_min": integer | null,
    "salary_max": integer | null,
    "salary_currency": string | null,
    "salary_period": string | null,
    "salary_includes": string | null,
    "is_competitive": boolean,
    "salary_inferred": boolean,
    "salary_min_inferred": integer | null,
    "salary_max_inferred": integer | null,
    "inference_basis": string | null,
    "equity": boolean,
    "equity_details": string | null,
    "benefits": [{ "category": string, "detail": string | null }]
  },

  "role_content": {
    "responsibilities": [{
      "text": string,
      "theme": string,
      "seniority_signal": string
    }],
    "key_responsibilities_summary": [string],
    "requirements_must_have": [{
      "text": string,
      "type": string,
      "years_required": integer | null
    }],
    "requirements_nice_to_have": [{
      "text": string,
      "type": string,
      "years_required": integer | null
    }],
    "requirements_inferred": [{
      "text": string,
      "inference_reason": string,
      "confidence": string
    }]
  },

  "skills": {
    "skills_technical": [{
      "skill": string,
      "importance": string,
      "source": string,
      "years_required": integer | null
    }],
    "skills_soft": [{
      "skill": string,
      "importance": string,
      "source": string,
      "years_required": integer | null
    }],
    "tools_and_platforms": [{
      "tool": string,
      "category": string,
      "importance": string,
      "source": string
    }],
    "programming_languages": [{
      "language": string,
      "importance": string
    }],
    "certifications_required": [{
      "certification": string,
      "is_required": boolean,
      "alternative_accepted": string | null
    }],
    "education_requirements": {
      "degree_level": string,
      "field_of_study": [string] | null,
      "is_required": boolean,
      "equivalent_experience_accepted": boolean
    }
  },

  "team_and_culture": {
    "team_structure": {
      "reports_to": string | null,
      "team_size": string | null,
      "direct_reports": integer | null,
      "cross_functional_partners": [string],
      "department": string | null
    },
    "company_values": [{
      "value": string,
      "is_genuine": boolean,
      "evidence": string | null
    }],
    "work_culture_signals": [{
      "signal": string,
      "type": string,
      "sentiment": string
    }]
  },

  "application_info": {
    "apply_url": string | null,
    "apply_email": string | null,
    "ats_platform": string,
    "apply_type": string,
    "application_deadline": string | null,
    "is_rolling": boolean,
    "job_reference": string | null,
    "posting_date": string | null
  },

  "right_to_work": {
    "visa_sponsorship_offered": boolean | null,
    "right_to_work_requirement": string | null,
    "security_clearance_required": boolean | null,
    "security_clearance_level": string | null
  },

  "jd_quality": {
    "jd_quality_score": integer,
    "jd_quality_grade": string,
    "jd_red_flags": [{
      "flag": string,
      "severity": string,
      "detail": string
    }],
    "jd_positive_signals": [{
      "signal": string,
      "detail": string
    }]
  },

  "ats_keywords": {
    "primary": [{
      "keyword": string,
      "frequency": integer,
      "prominence": string,
      "is_exact_phrase": boolean
    }],
    "secondary": [{
      "keyword": string,
      "frequency": integer,
      "prominence": string,
      "is_exact_phrase": boolean
    }],
    "inferred": [{
      "keyword": string,
      "reason": string
    }]
  },

  "tracker_enrichment": {
    "tracker_card_data": {
      "display_title": string,
      "display_company": string,
      "display_location": string,
      "display_salary": string,
      "employment_type_badge": string,
      "seniority_badge": string,
      "ats_platform_badge": string,
      "urgency_label": string | null,
      "source_badge": string
    },
    "interview_prep_topics": [{
      "topic": string,
      "why_likely": string,
      "prep_type": string
    }],
    "questions_to_ask_interviewer": [{
      "question": string,
      "why_ask": string,
      "targets": string
    }]
  },

  "completeness_report": {
    "field_completeness_summary": {
      "role_identity": { "complete": boolean, "missing": [string] },
      "company_info": { "complete": boolean, "missing": [string] },
      "location": { "complete": boolean, "missing": [string] },
      "compensation": { "complete": boolean, "missing": [string] },
      "responsibilities": { "complete": boolean, "missing": [string] },
      "requirements": { "complete": boolean, "missing": [string] },
      "application_info": { "complete": boolean, "missing": [string] }
    },
    "critical_missing_fields": [{
      "field": string,
      "impact": string,
      "how_to_get": string
    }],
    "user_action_prompts": [{
      "prompt": string,
      "field": string,
      "why_important": string,
      "input_type": string
    }]
  }
}"

## the data model that backs every field in this sidebar, mapped directly to the extraction prompt output

"// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// JOB MODEL — maps 1:1 to extraction prompt JSON output
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type ConfidenceLevel = "high" | "medium" | "low"
type SourceType = "explicit" | "inferred" | "unknown"

interface ExtractedField<T> {
  value: T
  source: SourceType
  confidence: ConfidenceLevel
}

// ── ROLE ──────────────────────────────────────────────
interface JobRole {
  job_title:            ExtractedField<string>
  job_title_variants:   string[]
  job_title_normalised: string        // → sidebar header h1
  role_family:          RoleFamily    // → category tag
  seniority_level:      ExtractedField<SeniorityLevel>  // → meta card
}

type RoleFamily =
  | "Engineering" | "Product" | "Design" | "Data" | "Marketing"
  | "Sales" | "Operations" | "Finance" | "Legal" | "People/HR"
  | "Customer Success" | "Research" | "Security" | "DevOps"
  | "AI/ML" | "Other"

type SeniorityLevel =
  | "intern" | "junior" | "mid" | "senior" | "lead"
  | "principal" | "director" | "vp" | "c-level" | "unknown"

// ── COMPANY ───────────────────────────────────────────
interface JobCompany {
  company_name:        ExtractedField<string>   // → sidebar header
  hiring_company:      string | null
  recruiting_agency:   string | null
  company_description: string | null
  company_stage:       ExtractedField<CompanyStage>
  company_size:        ExtractedField<CompanySize>
  company_industry:    ExtractedField<string>
  company_domain:      ExtractedField<string>   // → email matching
}

type CompanyStage = "startup" | "scaleup" | "enterprise" | "agency" | "unknown"
type CompanySize  = "1–10" | "11–50" | "51–200" | "201–500" | "501–1000" | "1001–5000" | "5000+"

// ── LOCATION ──────────────────────────────────────────
interface JobLocation {
  location_raw:           string | null
  location_type:          ExtractedField<LocationType>   // → meta card
  location_country:       ExtractedField<string>
  location_city:          ExtractedField<string | null>  // → header subtitle
  location_region:        string | null
  timezone_requirements:  string | null
  relocation_support:     boolean | null
}

type LocationType = "remote" | "hybrid" | "onsite" | "flexible" | "unknown"

// ── EMPLOYMENT ────────────────────────────────────────
interface JobEmployment {
  employment_type:    ExtractedField<EmploymentType>   // → header badge
  contract_duration:  string | null
  inside_ir35:        boolean | null
  start_date:         string | null
}

type EmploymentType =
  | "full-time" | "part-time" | "contract"
  | "freelance" | "internship" | "apprenticeship" | "temp" | "unknown"

// ── COMPENSATION ─────────────────────────────────────
interface JobCompensation {
  salary_raw:          string | null
  salary_min:          number | null   // → meta card
  salary_max:          number | null   // → meta card
  salary_currency:     string | null
  salary_period:       SalaryPeriod | null
  salary_includes:     string | null
  is_competitive:      boolean
  salary_inferred:     boolean         // → shows "Estimated" badge in UI
  salary_min_inferred: number | null
  salary_max_inferred: number | null
  inference_basis:     string | null
  equity:              boolean
  equity_details:      string | null
  benefits:            Benefit[]       // → benefits section in overview tab
}

type SalaryPeriod = "annual" | "monthly" | "daily" | "hourly"

interface Benefit {
  category: BenefitCategory
  detail:   string | null
}

type BenefitCategory =
  | "health" | "pension_401k" | "leave" | "learning" | "equipment"
  | "flexible_working" | "remote_stipend" | "equity" | "bonus"
  | "wellness" | "travel" | "other"

// ── ROLE CONTENT ─────────────────────────────────────
interface JobContent {
  responsibilities:             Responsibility[]
  key_responsibilities_summary: string[]        // → overview tab bullets (max 3)
  requirements_must_have:       Requirement[]   // → requirements tab "Must" badge
  requirements_nice_to_have:    Requirement[]   // → requirements tab "Nice" badge
  requirements_inferred:        InferredRequirement[]  // → "Inferred" badge
}

interface Responsibility {
  text:              string
  theme:             ResponsibilityTheme
  seniority_signal:  "ic" | "lead" | "strategic" | "neutral"
}

type ResponsibilityTheme =
  | "strategy" | "execution" | "leadership" | "technical"
  | "analytical" | "communication" | "operational" | "other"

interface Requirement {
  text:           string
  type:           RequirementType
  years_required: number | null
}

type RequirementType = "experience" | "skill" | "qualification" | "attribute" | "certification"

interface InferredRequirement {
  text:              string
  inference_reason:  string
  confidence:        ConfidenceLevel
}

// ── SKILLS & TECH ────────────────────────────────────
interface JobSkills {
  skills_technical:        Skill[]          // → key skills pills (critical/strong/nice)
  skills_soft:             Skill[]
  tools_and_platforms:     Tool[]
  programming_languages:   ProgrammingLanguage[]
  certifications_required: Certification[]
  education_requirements:  EducationRequirement
}

interface Skill {
  skill:          string
  importance:     Importance
  source:         SourceType
  years_required: number | null
}

interface Tool {
  tool:       string
  category:   ToolCategory
  importance: Importance
  source:     SourceType
}

type Importance   = "critical" | "strong" | "nice"
type ToolCategory =
  | "analytics" | "design" | "engineering" | "project_management"
  | "communication" | "data" | "marketing" | "sales"
  | "security" | "ai_ml" | "cloud" | "other"

interface ProgrammingLanguage {
  language:   string
  importance: Importance
}

interface Certification {
  certification:          string
  is_required:            boolean
  alternative_accepted:   string | null
}

interface EducationRequirement {
  degree_level:                  DegreeLevel
  field_of_study:                string[] | null
  is_required:                   boolean
  equivalent_experience_accepted: boolean
}

type DegreeLevel = "none" | "any" | "bachelor" | "master" | "phd" | "professional"

// ── TEAM & CULTURE ───────────────────────────────────
interface JobCulture {
  team_structure:        TeamStructure
  company_values:        CompanyValue[]
  work_culture_signals:  CultureSignal[]
}

interface TeamStructure {
  reports_to:                string | null
  team_size:                 string | null
  direct_reports:            number | null
  cross_functional_partners: string[]
  department:                string | null
}

interface CompanyValue {
  value:       string
  is_genuine:  boolean
  evidence:    string | null
}

interface CultureSignal {
  signal:    string
  type:      CultureSignalType
  sentiment: "positive" | "neutral" | "caution"   // → caution signals flagged in UI
}

type CultureSignalType =
  | "pace" | "autonomy" | "collaboration" | "hierarchy"
  | "innovation" | "flexibility" | "other"

// ── APPLICATION INFO ─────────────────────────────────
interface JobApplication {
  apply_url:            string | null
  apply_email:          string | null
  ats_platform:         ATSPlatform     // → meta card "ATS platform"
  apply_type:           ApplyType
  application_deadline: string | null   // → urgency label on card
  is_rolling:           boolean
  job_reference:        string | null
  posting_date:         string | null
}

type ATSPlatform =
  | "greenhouse" | "lever" | "workday" | "icims" | "taleo"
  | "ashby" | "smartrecruiters" | "bamboohr" | "jobvite"
  | "recruitee" | "rippling" | "linkedin" | "indeed"
  | "direct" | "email" | "unknown"

type ApplyType =
  | "internal_ats" | "external_url" | "email"
  | "linkedin_easy_apply" | "referral_only" | "unknown"

// ── RIGHT TO WORK ────────────────────────────────────
interface JobRightToWork {
  visa_sponsorship_offered:    boolean | null   // → header "Visa: detected"
  right_to_work_requirement:   string | null
  security_clearance_required: boolean | null
  security_clearance_level:    string | null
}

// ── JD QUALITY ───────────────────────────────────────
interface JobQuality {
  jd_quality_score:    number        // → "flags" tab score badge (0–100)
  jd_quality_grade:    QualityGrade  // → "flags" tab subtitle
  jd_red_flags:        JDFlag[]      // → flags tab — high/medium/low
  jd_positive_signals: JDPositive[]  // → flags tab green items
}

type QualityGrade = "excellent" | "good" | "fair" | "poor" | "very_poor"

interface JDFlag {
  flag:     string
  severity: "high" | "medium" | "low"
  detail:   string
}

interface JDPositive {
  signal: string
  detail: string
}

// ── ATS KEYWORDS ─────────────────────────────────────
interface JobATSKeywords {
  primary:   ATSKeyword[]    // → keywords tab "Primary" group
  secondary: ATSKeyword[]    // → keywords tab "Secondary" group
  inferred:  InferredKeyword[]  // → keywords tab "Inferred" group
}

interface ATSKeyword {
  keyword:        string
  frequency:      number
  prominence:     "title" | "requirements" | "responsibilities" | "company_description"
  is_exact_phrase: boolean
}

interface InferredKeyword {
  keyword: string
  reason:  string
}

// ── TRACKER ENRICHMENT ───────────────────────────────
interface JobTrackerEnrichment {
  tracker_card_data:            TrackerCardData
  interview_prep_topics:        PrepTopic[]    // → prep tab topics
  questions_to_ask_interviewer: InterviewQuestion[]  // → prep tab questions
}

interface TrackerCardData {
  display_title:          string    // → kanban card title (max 40 chars)
  display_company:        string    // → kanban card company
  display_location:       string    // → kanban card location
  display_salary:         string    // → kanban card salary or "Not disclosed"
  employment_type_badge:  string
  seniority_badge:        string
  ats_platform_badge:     string
  urgency_label:          string | null  // → "Closes Jul 6" badge
  source_badge:           string         // → "Indeed" "Reed" etc.
}

interface PrepTopic {
  topic:      string
  why_likely: string
  prep_type:  PrepType   // → colour-coded badge in prep tab
}

type PrepType = "behavioural" | "technical" | "case_study" | "cultural" | "portfolio"

interface InterviewQuestion {
  question: string
  why_ask:  string
  targets:  QuestionTarget
}

type QuestionTarget =
  | "role_clarity" | "culture" | "growth"
  | "team" | "strategy" | "compensation"

// ── COMPLETENESS ─────────────────────────────────────
interface JobCompleteness {
  field_completeness_summary: FieldCompleteness
  critical_missing_fields:    MissingField[]
  user_action_prompts:        ActionPrompt[]   // → post-import modal (max 3)
}

interface FieldCompleteness {
  role_identity:    { complete: boolean; missing: string[] }
  company_info:     { complete: boolean; missing: string[] }
  location:         { complete: boolean; missing: string[] }
  compensation:     { complete: boolean; missing: string[] }
  responsibilities: { complete: boolean; missing: string[] }
  requirements:     { complete: boolean; missing: string[] }
  application_info: { complete: boolean; missing: string[] }
}

interface MissingField {
  field:       string
  impact:      string
  how_to_get:  string
}

interface ActionPrompt {
  prompt:       string
  field:        string
  why_important: string
  input_type:   "text" | "number" | "date" | "boolean" | "select"
}

// ── ROOT JOB RECORD ──────────────────────────────────
// Everything above composes into this single root record
// stored per job in your database

interface Job {
  // System fields
  id:                string        // internal UUID
  user_id:           string
  cv_type:           "master" | "standalone" | "journey"
  tracker_stage:     TrackerStage
  source:            string        // "indeed" | "manual" | "email" | etc.
  source_job_id:     string | null
  source_url:        string | null
  match_score:       number        // composite score → "82%" on sidebar
  created_at:        string
  updated_at:        string
  applied_at:        string | null
  
  // Extraction metadata
  extraction_input_type:       string
  extraction_input_quality:    "high" | "medium" | "low" | "very_low"
  extraction_confidence:       ConfidenceLevel
  
  // All extracted data
  role:              JobRole
  company:           JobCompany
  location:          JobLocation
  employment:        JobEmployment
  compensation:      JobCompensation
  content:           JobContent
  skills:            JobSkills
  culture:           JobCulture
  application:       JobApplication
  right_to_work:     JobRightToWork
  quality:           JobQuality
  ats_keywords:      JobATSKeywords
  tracker_enrichment: JobTrackerEnrichment
  completeness:      JobCompleteness
}/usage

type TrackerStage =
  | "Draft" | "Created" | "Applied"
  | "Interview" | "Offer" | "Rejected" | "Withdrawn"
  "

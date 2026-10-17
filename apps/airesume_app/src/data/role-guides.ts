/**
 * Long-form, role-specific copy for the `/resume/<role>` pages.
 *
 * It lives here rather than in `resume/[role]/page.tsx` because that file already carries the role
 * registry (skills, summary and experience examples) and was nearing 500 lines; splitting the prose
 * keeps both files readable.
 *
 * Every entry must be genuinely specific to the role. These pages exist to rank on queries like
 * "data analyst resume", and 277 words of templated filler does not compete with pages that
 * actually explain what a hiring manager for that role looks for.
 */

export type RoleGuide = {
  howToIntro: string
  howTo: { title: string; body: string }[]
  mistakes: { title: string; body: string }[]
  faq: { question: string; answer: string }[]
}

export const ROLE_GUIDES: Record<string, RoleGuide> = {
  'data-analyst': {
    howToIntro:
      'A data analyst resume has one job before it has any other: prove you turn raw data into a decision someone made. Recruiters for these roles scan for the tools you used and the outcome you produced, in that order.',
    howTo: [
      {
        title: 'Lead with the outcome, not the toolset',
        body: 'A skills row full of SQL and Tableau tells a recruiter nothing they can act on. Open your summary with what you changed — the report that replaced a manual process, the churn you spotted — and let the tools support it.',
      },
      {
        title: 'Name the query language and the viz tool explicitly',
        body: 'Screening searches for analysts commonly look for exact terms: SQL, Python, Power BI, Tableau, Looker. "Advanced spreadsheet and reporting tools" will not match any of them, however accurate it feels.',
      },
      {
        title: 'Quantify the size of the data you handled',
        body: 'Row counts, refresh cadence and table counts signal seniority faster than adjectives. "Maintained the reporting layer" and "Owned a 40-table warehouse refreshed hourly" are not the same claim.',
      },
      {
        title: 'Show you communicated the finding',
        body: 'Analysis nobody acted on is not analysis. Mention the stakeholders you presented to, the dashboard you shipped, or the decision that changed because of your work.',
      },
      {
        title: 'Separate analysis from engineering',
        body: 'If you wrote production pipelines, say so — but keep it in its own bullet. Hiring managers filter for people who will sit with the business problem, not only maintain the infrastructure behind it.',
      },
    ],
    mistakes: [
      {
        title: 'Listing tools you have only watched tutorials for',
        body: 'You will be asked about window functions or data models in the first technical screen. Overstating a tool converts a solvable gap into a rejection.',
      },
      {
        title: 'A project list with no business context',
        body: '"Built a sales dashboard" leaves the reader to guess the problem. Two lines on what was ambiguous before you built it makes the same project worth reading.',
      },
      {
        title: 'Burying statistics education',
        body: 'If your degree is in statistics, economics or a quantitative field, it belongs near the top. Analyst screens still weight formal quantitative training heavily.',
      },
      {
        title: 'Screenshot charts instead of describing them',
        body: 'A chart image adds nothing a parser can read and little that a skim rewards. Write the insight as a sentence — the reader will not open an attachment to find it.',
      },
    ],
    faq: [
      {
        question: 'How long should a data analyst resume be?',
        answer: 'One page for under roughly seven years of experience, two beyond that. Analyst hiring managers tend to skim for tool names and outcomes, so density of specific, quantified bullets matters far more than covering every project you have touched.',
      },
      {
        question: 'Should I include SQL projects if I have no work experience?',
        answer: 'Yes, and they should be real analyses rather than course completions. A short project section with a question you asked, the data you used, what you found and how you visualised it demonstrates the actual skill employers are buying.',
      },
      {
        question: 'Which skills matter most for data analyst roles?',
        answer: 'SQL is the most consistently requested, followed by a visualization tool such as Power BI or Tableau, then Excel, and Python or R for anything statistical. Domain knowledge — retail, finance, healthcare — is what usually separates two otherwise equal candidates.',
      },
      {
        question: 'Does a data analyst resume need a portfolio?',
        answer: 'It helps, but it is not required to get interviews. A link to a GitHub repository, a public dashboard or a short write-up is enough to make your claims verifiable, and it matters more in later rounds than at screening.',
      },
      {
        question: 'How do I tailor a data analyst resume for each job?',
        answer: 'Mirror the tooling named in the posting in your first third, and reorder your bullets so the closest-matching work appears in your most recent role. If the posting asks for cohort analysis and you have done it, that sentence should not be below the fold.',
      },
    ],
  },

  'software-engineer': {
    howToIntro:
      'Engineering recruiters spend seconds on the first screen and they are looking for three things: the stack you have shipped with, the scale you have shipped at, and whether you have owned something end to end. Everything else is supporting detail.',
    howTo: [
      {
        title: 'Put the stack where it can be scanned',
        body: 'A compact, honest technology list near the top does the filtering work for both sides. Keep out anything you used once three years ago — you will be interviewed on it.',
      },
      {
        title: 'Describe systems, not tasks',
        body: '"Implemented a feature" describes a ticket. "Replaced the nightly batch with an event-driven pipeline, cutting data lag from six hours to ninety seconds" describes an engineer. Aim for the second shape in every bullet.',
      },
      {
        title: 'Quantify scale or reliability',
        body: 'Requests per second, uptime, latency, team size, deploy frequency or users affected. Any one of these gives a reader a way to calibrate the work; none of them requires revealing anything confidential.',
      },
      {
        title: 'Show the outcome of your engineering decisions',
        body: 'Tests that raised coverage, a refactor that shortened review time, a migration that removed a class of incidents. Engineering value is expressed in what got easier or cheaper afterwards.',
      },
      {
        title: 'Link to work they can inspect',
        body: 'A GitHub profile, a public package or a technical write-up is more persuasive than a bullet claiming open-source experience. Even one maintained repository is enough to look real.',
      },
    ],
    mistakes: [
      {
        title: 'A three-page resume full of every language ever touched',
        body: 'Length signals nothing; relevance signals everything. Cut the technologies that do not appear in the job description and the roles that do not support the story you are telling.',
      },
      {
        title: 'Listing responsibilities instead of results',
        body: '"Responsible for backend services" is a job description echoed back. Say what changed because you were there.',
      },
      {
        title: 'Concealing the size of what you worked on',
        body: 'If you worked on a small system, say so and own the depth you had. Recruiters infer scale from vagueness, and they usually infer it unkindly.',
      },
      {
        title: 'Leaving out the collaboration that mattered',
        body: 'Mentoring, reviews, cross-team design work and incident leadership are what promote engineers past the senior bar. Omitting them costs you at exactly the level where pay jumps.',
      },
    ],
    faq: [
      {
        question: 'How long should a software engineer resume be?',
        answer: 'One page for most candidates, two once you have eight or more years and substantial systems to describe. Recruiters read the first page almost exclusively, so anything critical belongs there rather than on page two.',
      },
      {
        question: 'Should I list every technology I know?',
        answer: 'No. List what you would be comfortable being interviewed on today, roughly eight to twelve items, and put them in a scannable block. A long list with weak entries invites questions about the weak entries.',
      },
      {
        question: 'Do side projects belong on a professional resume?',
        answer: 'Yes when you have limited professional experience, and when the project is genuinely finished or maintained. They carry less weight than production work but far more than an empty project section.',
      },
      {
        question: 'Is a summary objective necessary for engineers?',
        answer: 'A two-line summary is useful only when it states your level, your core stack and the kind of system you build. A generic objective paragraph wastes the most valuable space on the page.',
      },
      {
        question: 'How do I show seniority without inflating my title?',
        answer: 'Use scope: the size of the system, the number of teams you worked across, whether you set technical direction or executed against it, and whether you were the person called at three in the morning.',
      },
    ],
  },

  'frontend-developer': {
    howToIntro:
      'Frontend hiring is unusually visual, which means your resume is being judged as a frontend artifact before a word of it is read. Layout discipline, typographic care and a fast first paint all count as evidence.',
    howTo: [
      {
        title: 'Let the document demonstrate the craft',
        body: 'Consistent spacing, a real type scale and a layout that survives narrow widths tell a frontend recruiter more than a skills list. Ship the resume as a clean PDF and let it be the first work sample.',
      },
      {
        title: 'Name the framework and the version era',
        body: 'React, Vue, Angular, Svelte and the meta-framework around each. "Modern JavaScript frameworks" is unsearchable and tells a hiring manager nothing about ramp-up time.',
      },
      {
        title: 'Quantify performance work specifically',
        body: 'Bundle size before and after, Largest Contentful Paint, Lighthouse score, conversion change. Frontend performance is the easiest engineering work to prove with numbers, so use them.',
      },
      {
        title: 'Include accessibility and design-system experience',
        body: 'WCAG conformance, component libraries, tokens and documentation are now baseline expectations for most product teams. If you have done it, it is a differentiator worth a bullet.',
      },
      {
        title: 'Link to a portfolio or a live product',
        body: 'One URL a recruiter can open on a phone beats any amount of description. If you cannot link the product you built, describe the part of it you owned and the constraint you worked under.',
      },
    ],
    mistakes: [
      {
        title: 'A portfolio link that does not work on mobile',
        body: 'Most first views happen on a phone. A broken route, an unstyled page or a five-second load costs you the impression you were trying to make.',
      },
      {
        title: 'Listing CSS frameworks without results',
        body: 'Tailwind or Bootstrap on its own is table stakes. Pair it with what it enabled — faster shipping, a shared component set, consistent theming across products.',
      },
      {
        title: 'Describing design collaboration as "worked with designers"',
        body: 'Say what you actually did: pulled tokens from Figma, challenged an interaction that could not be built, or introduced a review step that cut rework.',
      },
      {
        title: 'Skipping the testing story',
        body: 'Unit tests, interaction tests and visual regression are asked in most frontend screens. Silence on testing reads as an assumption that you did not write any.',
      },
    ],
    faq: [
      {
        question: 'Should a frontend developer resume be a designed document?',
        answer: 'It should be well-crafted, not decorated. A single column, strong hierarchy and a reliable export will always outperform a multi-column layout that breaks the moment a recruiter prints it or a parser reads it.',
      },
      {
        question: 'Do React and TypeScript beat a longer skills list?',
        answer: 'For most product roles, yes. Depth in the stack the team actually uses is what gets the interview; a long list of adjacent tools rarely changes the outcome.',
      },
      {
        question: 'How do I present frontend performance improvements?',
        answer: 'State the starting number, what you changed and the resulting number. "Reduced initial JS from 1.4 MB to 380 KB by code-splitting routes" is a complete, credible claim in one line.',
      },
      {
        question: 'Is visual design ability expected?',
        answer: 'For product frontend roles, some visual judgment is expected; for platform or infrastructure frontend work it is not. Either way, your resume should show you care about spacing and hierarchy.',
      },
      {
        question: 'How should I list a UI component library I built?',
        answer: 'Name its scope — how many components, how many consumers, whether it had documentation and tests — and one consequence, such as reduced duplication or faster feature delivery.',
      },
    ],
  },

  'backend-developer': {
    howToIntro:
      'Backend screening is about trust: can this person build something that stays up, and do they understand what happens when it does not. Your resume should read like evidence of systems that survived contact with traffic.',
    howTo: [
      {
        title: 'Lead with architecture you owned',
        body: 'Services designed, data models chosen, migrations run. Ownership of a system boundary is the clearest signal of backend seniority short of a title.',
      },
      {
        title: 'Quantify throughput and reliability',
        body: 'Requests per second, p95 latency, uptime, queue depth, error rate. Backend claims are unusually easy to make concrete, and vague ones are unusually easy to disbelieve.',
      },
      {
        title: 'Name the datastore and why it was chosen',
        body: 'Postgres, MongoDB, Redis, Kafka and the reasoning attached. "Moved session storage to Redis to remove repeated joins under load" demonstrates judgment, not just familiarity.',
      },
      {
        title: 'Describe what you automated or removed',
        body: 'Deploys, retries, reconciliation jobs, manual interventions. Backend engineering value is often expressed as something a team stopped doing.',
      },
      {
        title: 'Include the operational surface you covered',
        body: 'On-call, incident response, monitoring and alerting are what separate a developer who writes code from one who is responsible for it. That responsibility is what senior roles pay for.',
      },
    ],
    mistakes: [
      {
        title: 'Listing frameworks without data or infrastructure',
        body: 'Spring Boot or Express alone says very little. Pair it with the database, the queue and the deployment environment so a reader can picture the system you worked in.',
      },
      {
        title: 'Hiding security and data-handling work',
        body: 'Authentication, authorisation, encryption and compliance are heavily weighted and frequently omitted. If you implemented them, put them in plain language.',
      },
      {
        title: 'Omitting failure cases',
        body: 'Systems that handle retries, idempotency and partial failures are worth more than systems that handle the happy path. Say what you did about the unhappy path.',
      },
      {
        title: 'Vague statements about scale',
        body: '"High-traffic application" means nothing without a number or a comparison. Even a range gives the reader something to calibrate against.',
      },
    ],
    faq: [
      {
        question: 'Which skills should a backend developer emphasise?',
        answer: 'The language and framework the target role uses, the primary datastore, and one of caching, queues or orchestration. Depth in a coherent stack beats breadth across every backend technology you have touched.',
      },
      {
        question: 'How do I describe microservices experience honestly?',
        answer: 'State the number of services, your responsibility within them and how they communicated. If you worked on two services in a larger estate, say that — the precision is more credible than the word alone.',
      },
      {
        question: 'Should I include system design details on a resume?',
        answer: 'At a high level, yes: components, data flow and the constraint that shaped them. Detailed diagrams belong in the interview, not in a document that gets twenty seconds.',
      },
      {
        question: 'Is on-call experience important?',
        answer: 'For senior and staff roles it is often decisive, because it proves you have lived with the consequences of your design decisions. Describe what you were paged for and what you changed afterwards.',
      },
      {
        question: 'How much detail about databases belongs on the resume?',
        answer: 'Name them, and name one specific contribution — an index that cut a query from seconds to milliseconds, a schema migration run without downtime. Specificity is what makes the skill believable.',
      },
    ],
  },

  'fullstack-developer': {
    howToIntro:
      'Full-stack roles attract the most generic resumes, because the label itself is generic. The way through is to show depth on at least one side while proving you can carry a feature across the whole stack.',
    howTo: [
      {
        title: 'Anchor on one side',
        body: 'Say plainly whether you are front-weighted or back-weighted, then support it. Teams hire full-stack developers to reduce coordination, not to avoid choosing someone with a centre of gravity.',
      },
      {
        title: 'Follow one feature end to end',
        body: 'Pick a feature and describe it across every layer you touched — schema, API, UI, deployment. That single narrative proves more than a list of technologies.',
      },
      {
        title: 'Name the whole delivery path',
        body: 'Repository, CI, hosting, environment and monitoring. Full-stack competence is largely about owning the path from a commit to something running in front of users.',
      },
      {
        title: 'Show you can work without a specialist',
        body: 'In smaller teams the value is covering gaps: writing the migration, fixing the styling, wiring the webhook. Mention the roles you filled when there was nobody else to fill them.',
      },
      {
        title: 'Quantify across layers',
        body: 'A single bullet can carry a frontend number and a backend number. Combining them reads as one coherent change rather than two unrelated claims.',
      },
    ],
    mistakes: [
      {
        title: 'A skills list so long it means nothing',
        body: 'Twenty-plus technologies across both ends signals surface exposure. Trim to the stack you actually shipped with and let depth do the arguing.',
      },
      {
        title: 'Never showing the seam between the layers',
        body: 'The interesting full-stack work happens at the boundaries: contract design, validation, error handling, optimistic UI. Bullets that stop at "built the API" or "built the page" miss it.',
      },
      {
        title: 'Presenting yourself as a solo everything',
        body: 'Claiming you did it all alone reads as a team that had no review culture. Describe collaboration honestly; it is not a weakness.',
      },
      {
        title: 'Ignoring infrastructure entirely',
        body: 'Most full-stack roles expect some deployment competence. If you have containerised, deployed or configured a pipeline, that belongs on the page.',
      },
    ],
    faq: [
      {
        question: 'What does a strong full-stack developer resume look like?',
        answer: 'A clear centre of gravity, one end-to-end feature described across all layers, and quantified results on both the interface and the service side. It should read as one engineer who can ship, not two partial ones.',
      },
      {
        question: 'Which stack should I lead with?',
        answer: 'The stack closest to the job description. If the posting is React and Node, lead with that even if your strongest work was in Python — you can move later, but you must pass the first screen.',
      },
      {
        question: 'Should I split my skills into frontend and backend?',
        answer: 'Yes. Two short grouped lists are far easier to scan than one long undifferentiated one, and the grouping itself communicates that you understand the distinction.',
      },
      {
        question: 'Is one page enough for full-stack experience?',
        answer: 'One page for most candidates. Because full-stack roles generate more bullet candidates than specialised ones, the discipline of cutting is even more important — every line should earn its place.',
      },
      {
        question: 'How do I show I can work independently?',
        answer: 'Describe features you took from requirement to production without handoffs: the decisions you made, the trade-offs you accepted, and what shipped as a result.',
      },
    ],
  },

  'product-manager': {
    howToIntro:
      'Product resumes fail when they describe process instead of consequence. Hiring managers want to know what shipped, what moved, and what you decided when the data was incomplete — in that order.',
    howTo: [
      {
        title: 'Open with outcomes, not methodology',
        body: 'Certifications and frameworks matter less than evidence you have moved a number. Lead your summary with the metric you are proudest of and the timeframe you moved it in.',
      },
      {
        title: 'Quantify with business figures',
        body: 'Revenue, retention, activation, cost-to-serve, cycle time. Where an absolute number is confidential, a percentage or a multiple still communicates scale.',
      },
      {
        title: 'Show the decision, not just the delivery',
        body: 'Shipping is table stakes. What distinguishes a strong PM is the call you made against competing evidence — include the trade-off and why you chose it.',
      },
      {
        title: 'Make discovery visible',
        body: 'Interviews run, segments tested, assumptions invalidated. Discovery work is often the differentiator between a PM who executes a roadmap and one who sets it.',
      },
      {
        title: 'Include the cross-functional scope you operated in',
        body: 'Teams, functions and stakeholders you coordinated. Programme complexity is a real measure of seniority and it does not come across from a job title alone.',
      },
    ],
    mistakes: [
      {
        title: 'A responsibility list lifted from a job description',
        body: '"Owned the product backlog across multiple squads" describes almost every PM. Replace it with what shipped and what it changed.',
      },
      {
        title: 'Metrics without a baseline',
        body: '"Increased engagement by 40%" is meaningless until the reader knows the starting point and the timeframe. Give both.',
      },
      {
        title: 'Focusing on features rather than problems',
        body: 'Features are outputs. Describe the problem you validated, the evidence you had, and the outcome the solution produced.',
      },
      {
        title: 'Hiding the unsuccessful bets',
        body: 'A short, candid note about something you stopped or pivoted away from reads as judgment rather than failure — and it is a common interview question anyway.',
      },
    ],
    faq: [
      {
        question: 'How should a product manager resume be structured?',
        answer: 'A two-line summary carrying your strongest metric, then experience bullets that each state the problem, the decision and the result. Keep education and certifications below experience once you have a few years in role.',
      },
      {
        question: 'What metrics belong on a PM resume?',
        answer: 'The ones tied to the outcome you own: revenue, activation, retention, conversion, cost, or delivery cycle time. One well-explained metric is worth more than five unexplained ones.',
      },
      {
        question: 'Should I include product certifications?',
        answer: 'Early in your career, yes — they help signal intent. After several years they carry little screening weight and should sit below experience and results.',
      },
      {
        question: 'How do I show technical credibility as a PM?',
        answer: 'Describe a technical decision you shaped: an API contract, a migration sequence, a data model trade-off. Specificity proves fluency far better than claiming to be "highly technical".',
      },
      {
        question: 'How long should a product manager resume be?',
        answer: 'Two pages is normal and acceptable at senior level because the achievements need context. Beyond two pages, you are describing rather than evidencing.',
      },
    ],
  },

  'business-analyst': {
    howToIntro:
      'Business analyst hiring turns on one question: can you translate between the people who want something and the people who build it. Your resume has to show requirements work that led to a real change.',
    howTo: [
      {
        title: 'Tie every requirement to an outcome',
        body: 'Elicitation and documentation are inputs. What matters is the process that got faster, the defect rate that fell, or the revenue that stopped leaking.',
      },
      {
        title: 'Name the artefacts you produced',
        body: 'BRDs, user stories, process maps, acceptance criteria, traceability matrices. Concrete artefacts are what a hiring manager pictures when they picture you doing the job.',
      },
      {
        title: 'Quantify the scope you handled',
        body: 'Stakeholders interviewed, squads supported, requirements per release, systems in scope. Scale here is measured in coordination, not code.',
      },
      {
        title: 'Show the analysis, not only the gathering',
        body: 'Gap analysis, cost-benefit, root-cause and data-driven prioritisation demonstrate that you evaluate options rather than transcribing requests.',
      },
      {
        title: 'Include the domain explicitly',
        body: 'Finance, healthcare, logistics, retail — domain knowledge compounds, and screening for regulated industries filters on it hard. Name the sector you know.',
      },
    ],
    mistakes: [
      {
        title: 'Describing yourself as a scribe',
        body: 'If every bullet says you gathered and documented requirements, you look like a note-taker. Add the judgement: what you recommended, what was cut, and why.',
      },
      {
        title: 'No evidence of working with data',
        body: 'Modern BA roles expect SQL, dashboards or modelling. Omitting it makes a resume look dated against candidates who have it.',
      },
      {
        title: 'Softening conflict and change management',
        body: 'Requirement work is largely negotiation. Saying you aligned disagreeing stakeholders on a scope cut is a stronger claim than saying you supported delivery.',
      },
      {
        title: 'Leaving out the testing and sign-off side',
        body: 'UAT, acceptance criteria and defect triage are where BA work is verified. Their absence suggests you handed off before the outcome was known.',
      },
    ],
    faq: [
      {
        question: 'Which skills should a business analyst resume highlight?',
        answer: 'Requirements elicitation, process modelling, SQL or data analysis, and one modelling or tracking tool such as Jira, Visio or Power BI. Communication and stakeholder negotiation belong in the bullets, not only in the skills list.',
      },
      {
        question: 'Is SQL necessary for business analyst roles?',
        answer: 'Increasingly yes. Many postings treat it as expected, and even basic query ability changes what you can validate independently. If you have it, show where you used it rather than listing it.',
      },
      {
        question: 'Should I include certifications like CBAP or IIBA?',
        answer: 'They help at larger and regulated employers and matter less at startups. List them near the top if the job description mentions them, otherwise below experience.',
      },
      {
        question: 'How do I show business impact as a BA?',
        answer: 'Anchor each bullet to something measurable: time saved, errors avoided, cost reduced, or a decision enabled. If the number is unavailable, describe the before and after qualitatively but concretely.',
      },
      {
        question: 'How long should a business analyst resume be?',
        answer: 'One or two pages depending on experience. Recruiters screen for the tools and the domain first, so make sure both appear before the second page.',
      },
    ],
  },

  'data-scientist': {
    howToIntro:
      'Data science resumes are read by two people with different questions: a recruiter checking for tools, and a technical reviewer checking whether the model ever reached a user. Both need to find their answer quickly.',
    howTo: [
      {
        title: 'State the deployment, not only the model',
        body: 'Accuracy on a held-out set is academic until something consumes the output. Say how the model was served, monitored and used.',
      },
      {
        title: 'Give the baseline you beat',
        body: '"Improved churn prediction AUC from 0.71 to 0.84" is a claim a reviewer can interrogate. A bare accuracy figure invites the question of what it was measured against.',
      },
      {
        title: 'Name the data, not just the algorithm',
        body: 'Volume, dimensionality, imbalance, leakage risk and refresh rate often determine difficulty more than the choice of gradient boosting.',
      },
      {
        title: 'Separate research from production work',
        body: 'Publications and experiments show depth; pipelines and monitoring show delivery. Label which is which so neither reader has to guess.',
      },
      {
        title: 'Describe the communication of the result',
        body: 'Stakeholder presentations, decisions changed, features shipped. Data scientists who influence a decision are easier to hire than those who only produce analyses.',
      },
    ],
    mistakes: [
      {
        title: 'A model list with no business question',
        body: 'Algorithms are means. Say what question the model answered and what someone did differently afterwards.',
      },
      {
        title: 'Claiming publications you did not lead',
        body: 'Co-authorship and contribution level are checked. Be precise about your role; vagueness reads badly to a technical reviewer.',
      },
      {
        title: 'Omitting data engineering work',
        body: 'Cleaning, joining and validating data is most of the job. Leaving it out makes the work look smaller than it was while also hiding a skill many teams need.',
      },
      {
        title: 'Buzzword density over substance',
        body: 'Long lists of methods with nothing applied to a real problem read as course completion. Show one method used well instead of ten named.',
      },
    ],
    faq: [
      {
        question: 'Should a data scientist resume include projects?',
        answer: 'Yes, especially early on. A project with a stated question, the data source, the method and the result demonstrates more than a list of algorithms, and it gives an interviewer something concrete to ask about.',
      },
      {
        question: 'How important are publications and Kaggle results?',
        answer: 'Publications matter for research-track roles and little elsewhere. Kaggle competitions help when you are junior, but production experience outweighs them quickly.',
      },
      {
        question: 'Which skills are most requested for data scientists?',
        answer: 'Python, SQL, a statistical or ML framework such as scikit-learn or PyTorch, and experience with a cloud platform. Experiment tracking and deployment tooling increasingly appear as well.',
      },
      {
        question: 'How do I show I can deploy models?',
        answer: 'Name the mechanism: a REST endpoint, a batch job, a streaming consumer, or a scheduled retraining pipeline. Include how you monitored it for drift if you did.',
      },
      {
        question: 'Should I include a PhD?',
        answer: 'If you have one, yes — especially for research-heavy roles. For applied roles, place it below the experience that demonstrates you can ship.',
      },
    ],
  },

  'ui-ux-designer': {
    howToIntro:
      'Design hiring is decided by evidence of process and taste working together. Your resume is the first artifact judged for both, so its own typography and hierarchy are part of the application.',
    howTo: [
      {
        title: 'Show the problem before the pixels',
        body: 'A portfolio piece that opens with the constraint and the research reads as a designer, not a decorator. Mirror that structure in your bullets.',
      },
      {
        title: 'Quantify where you honestly can',
        body: 'Task completion, onboarding conversion, support tickets reduced, usability test results. Design metrics are harder to gather than engineering ones, so any you have are valuable.',
      },
      {
        title: 'State your tooling plainly',
        body: 'Figma, prototyping tools, design systems and handoff practice. Screening software and recruiters both look for these as exact terms.',
      },
      {
        title: 'Make design systems experience explicit',
        body: 'Tokens, components, documentation and adoption across teams are how design scales. If you built or maintained any of that, it deserves its own bullet.',
      },
      {
        title: 'Describe working with engineering',
        body: 'Specs, reviews, edge cases and the compromises you accepted. Teams hire designers who make implementation easier, and they look for evidence of it.',
      },
    ],
    mistakes: [
      {
        title: 'A resume that looks worse than the portfolio',
        body: 'Inconsistent spacing, a decorative font that fails to export, or a layout that breaks at print width undercuts everything else on the page.',
      },
      {
        title: 'Screenshots with no narrative',
        body: 'An image of a finished screen shows the outcome only. Add the reasoning and the measured effect or the piece cannot be evaluated.',
      },
      {
        title: 'Only listing research or only listing UI',
        body: 'Most roles want both ends. If you are strongly one or the other, say so deliberately rather than letting a thin bullet imply you do both poorly.',
      },
      {
        title: 'Omitting handoff and accessibility',
        body: 'Specs, WCAG conformance and component collaboration are frequently asked. Silence on them suggests you stopped at the mockup.',
      },
    ],
    faq: [
      {
        question: 'Does a UI/UX resume need to be visually designed?',
        answer: 'It needs to demonstrate care, not decoration. A clear grid, restrained type and a reliable export show more judgment than gradients and icon sets, and it keeps the document readable by parsers.',
      },
      {
        question: 'How many portfolio pieces should I link?',
        answer: 'Three strong ones beats ten shallow. Choose pieces that span research, interaction and visual work, and make sure each is openable on a phone without a login.',
      },
      {
        question: 'Should I include metrics for design work?',
        answer: 'Yes where they exist — completion rates, time on task, adoption, ticket volume. Where they do not, describe the before and after qualitatively and be honest that it was qualitative.',
      },
      {
        question: 'Which skills are most searched for in UX roles?',
        answer: 'Figma, user research, wireframing, prototyping, design systems and usability testing. Accessibility is appearing in more postings and is worth including if you have applied it.',
      },
      {
        question: 'How long should a designer resume be?',
        answer: 'One page is the norm, because the portfolio carries the depth. Anything that belongs in a case study should link out rather than be written out in full.',
      },
    ],
  },

  'devops-engineer': {
    howToIntro:
      'DevOps hiring is a trust exercise: someone is deciding who gets the keys. The resume has to show systems that stayed up, changes that were automated, and an engineer who reduced the number of things a team has to think about.',
    howTo: [
      {
        title: 'Quantify reliability improvements',
        body: 'Deployment frequency, lead time, change failure rate, MTTR and uptime. These four DORA figures are widely understood and immediately calibrate your experience.',
      },
      {
        title: 'State the size of the estate',
        body: 'Nodes, clusters, services, accounts or regions under management. Infrastructure work scales in ways a job title does not convey.',
      },
      {
        title: 'Show cost as well as reliability',
        body: 'Right-sizing, reserved capacity, storage tiering and the percentage saved. Finance-aware infrastructure engineering is disproportionately valued and frequently unmentioned.',
      },
      {
        title: 'Describe everything as code',
        body: 'Terraform modules, Ansible playbooks, Helm charts and pipeline definitions. Reproducibility is the core promise of the discipline, so name how you delivered it.',
      },
      {
        title: 'Make the incident story concrete',
        body: 'A failure class you eliminated, an alert you fixed, a runbook you wrote. Reductions in recurring pain are more persuasive than generic claims of ownership.',
      },
    ],
    mistakes: [
      {
        title: 'Tool lists without context',
        body: 'Docker, Kubernetes and AWS appear on almost every resume. Say how they were used — at what scale, for what workload, and under what constraints.',
      },
      {
        title: 'Ignoring security and compliance',
        body: 'Secrets management, least-privilege IAM, patching and audit work are heavily weighted in regulated environments. Leaving them out can filter you out of exactly the roles you want.',
      },
      {
        title: 'Describing only greenfield work',
        body: 'Most environments are brownfield. Migration, legacy constraint and incremental improvement demonstrate more judgment than rebuilding from scratch.',
      },
      {
        title: 'No mention of the humans',
        body: 'Runbooks, onboarding, enablement and training are how infrastructure scales past one person. Their absence suggests you were the bottleneck.',
      },
    ],
    faq: [
      {
        question: 'Which certifications help a DevOps engineer resume?',
        answer: 'Cloud certifications from AWS, Azure or GCP carry weight at larger employers and in consulting. Kubernetes and Terraform certifications help when the job description names them. They support experience; they do not replace it.',
      },
      {
        question: 'Should I include programming skills for DevOps roles?',
        answer: 'Yes. Scripting in Python, Bash or Go is expected for anything beyond entry level, and automation work is impossible to describe without it.',
      },
      {
        question: 'How do I show Kubernetes experience meaningfully?',
        answer: 'State the cluster count and size, what you ran on it, and what you owned — deployments, networking, scaling, upgrades or troubleshooting. Ownership is what separates usage from exposure.',
      },
      {
        question: 'What metrics matter most on a DevOps resume?',
        answer: 'Deployment frequency, lead time for changes, change failure rate and mean time to recovery, plus availability and cost where you can attribute them. Pick two or three and explain them.',
      },
      {
        question: 'Is on-call experience required?',
        answer: 'It is expected for mid and senior roles and it is one of the fastest ways to prove you understand production. Describe the rotation size and what you were responsible for escalating.',
      },
    ],
  },

  'project-manager': {
    howToIntro:
      'Project manager resumes are screened for delivery scale before anything else: budget, team size, duration and whether the work actually finished. The second thing a recruiter looks for is the method your future team runs — Agile, waterfall or something between — along with the tools you have used to hold a plan together.',
    howTo: [
      {
        title: 'Quantify the scope of every project',
        body: 'Budget owned, headcount coordinated, duration and number of workstreams. "Delivered a 14-month ERP rollout with a $1.2M budget across four departments" is a different claim from "managed projects".',
      },
      {
        title: 'Name the methodology and the toolchain',
        body: 'Agile, Scrum, Waterfall, PRINCE2, hybrid — plus Jira, MS Project, Smartsheet, Confluence or Asana. Screening for project roles searches these terms directly, and a resume that only mentions SDLC experience will not surface.',
      },
      {
        title: 'Lead each bullet with a delivery outcome',
        body: 'Delivered on time, under budget, milestones recovered, adoption after launch. Sponsors hire project managers to protect dates and outcomes, so show the ones you protected rather than the meetings you ran.',
      },
      {
        title: 'Make risk and dependency management visible',
        body: 'The risks you flagged early, the dependencies you cleared across teams, the plan you re-baselined when a vendor slipped. Judgment under pressure is the real product of an experienced project manager.',
      },
      {
        title: 'List certifications with status and dates',
        body: 'PMP, CSM, PRINCE2, ACP. Give the credential, issuing body and year — and if you are still qualifying for the PMP exam, say so, because recruiters treat an in-progress certification very differently from a silent gap.',
      },
    ],
    mistakes: [
      {
        title: 'Project bullets with no numbers attached',
        body: 'Without budget, duration or team size the reader cannot calibrate whether you ran a $50K website or a company-wide migration. Every project should carry at least two scope figures.',
      },
      {
        title: 'Echoing the job description back',
        body: '"Responsible for managing cross-functional projects to completion" describes the posting, not you. Replace it with a specific project and what changed because of your management.',
      },
      {
        title: 'Claiming expertise in every methodology',
        body: 'A resume that says expert in Agile, Waterfall, PRINCE2, Lean and Six Sigma reads as no depth anywhere. Pick the two you genuinely ran and describe them.',
      },
      {
        title: 'Hiding the stakeholder conflict',
        body: 'Project management is negotiation across teams that disagree. Leaving out the scope fight you won or the sponsor you re-aligned makes the resume look administrative rather than managerial.',
      },
    ],
    faq: [
      {
        question: 'How long should a project manager resume be?',
        answer: 'One page early in your career, two once you have five or more years and a portfolio of projects worth describing. Recruiters scan the top third for scope and method, so your strongest project belongs there.',
      },
      {
        question: 'Do I need a PMP to get project manager interviews?',
        answer: 'For enterprise, government and consulting roles, often yes — many postings filter on it directly. In startups and smaller companies, demonstrated delivery usually outweighs the credential, so lead with results and add the certification when you have it.',
      },
      {
        question: 'How do I show project experience without a PM title?',
        answer: 'Describe the project work you did inside the other role: the plan you owned, the timeline you ran, the teams you coordinated. A selected-projects section works well when the title never changed but the responsibilities did.',
      },
      {
        question: 'Which project management tools should I list?',
        answer: 'Jira and MS Project are the two most requested, followed by Confluence, Smartsheet, Asana and Monday. List only what you have actually planned work in — you will be asked how you structured sprints or baselines.',
      },
      {
        question: 'What do I do about confidential project budgets?',
        answer: 'Use relative scale instead: "projects in the $500K–$2M range" or "a portfolio of eight initiatives worth roughly $3M annually". Ranges preserve confidentiality while still giving the reader a calibration point.',
      },
    ],
  },

  'machine-learning-engineer': {
    howToIntro:
      'Machine learning engineer resumes are screened as engineering documents before anything else: reviewers want to know whether your models ever left a notebook. They scan for the framework you work in, the path the model takes to production, and the latency or cost it runs under.',
    howTo: [
      {
        title: 'Lead with the system, not the accuracy',
        body: 'Say how the model is served — a REST endpoint, a batch job, a streaming consumer or on-device — and what it costs to run. A model that only exists in a training script is data science work, and this role is hired for the other half.',
      },
      {
        title: 'Give the baseline you beat',
        body: '"Cut false positives by a third against the existing rules engine" or "AUC moved from 0.74 to 0.86 on a production holdout" is a claim a reviewer can interrogate. A bare accuracy number invites the question of what it was measured against.',
      },
      {
        title: 'Name the MLOps stack explicitly',
        body: 'PyTorch or TensorFlow, experiment tracking such as MLflow or Weights & Biases, feature stores, orchestration like Airflow or Kubeflow, and the cloud you ran it on. These are exact-match terms in technical screens.',
      },
      {
        title: 'Describe the data and monitoring work',
        body: 'Validation, labelling pipelines, drift detection, retraining cadence and the alerting that tells you a model went stale. Teams that have been burned by silent degradation weight this heavily and rarely see it on resumes.',
      },
      {
        title: 'Separate research from production, and credit your role',
        body: 'Papers and competitions show depth; services and pipelines show delivery. Label which contribution was yours when you worked in a team, because a technical reviewer will ask anyway.',
      },
    ],
    mistakes: [
      {
        title: 'Notebook projects presented as engineering experience',
        body: 'A competition solution or a course project with 95% accuracy shows modelling, not engineering. Add the deployment — even a container and a scheduled job — and it becomes evidence of the skill being hired.',
      },
      {
        title: 'Listing every framework shallowly',
        body: 'PyTorch, TensorFlow, JAX, XGBoost, Hugging Face and Spark with no shipped work behind them reads as course completion, and the technical screen will find the weakest entry first.',
      },
      {
        title: 'Accuracy with no business or cost context',
        body: 'Model quality only matters relative to what it replaced and what it costs to serve. A slightly worse model that runs fifty times cheaper is often the right engineering answer — show you understand that trade-off.',
      },
      {
        title: 'Skipping the software engineering around the model',
        body: 'Tests, CI, code review, quantization, batching and GPU utilisation are the day-to-day of the job. Omitting them makes a research profile look like an engineer, which is the wrong signal for this title.',
      },
    ],
    faq: [
      {
        question: 'Do I need a PhD to become a machine learning engineer?',
        answer: 'For research-heavy lab roles, usually. For applied ML engineering, no: production software experience plus one deployed model counts more. Frame your strongest shipped system in the top third of the resume.',
      },
      {
        question: 'How is an ML engineer resume different from a data scientist one?',
        answer: 'The data scientist resume leads with methods, experiments and findings; the ML engineer resume leads with services, latency, throughput and reliability. If your bullets end in "improved accuracy", rewrite them to end in "served at 50 ms p99".',
      },
      {
        question: 'I have no production ML experience — what do I put?',
        answer: 'Deploy something end to end and describe it fully: data source, training pipeline, container, endpoint, monitoring. Prior software engineering experience carries a lot of weight; most people enter the field from exactly that direction.',
      },
      {
        question: 'Which ML skills should I list?',
        answer: 'One deep learning framework, Python, SQL, one orchestration or experiment-tracking tool, and the cloud you know. Add MLOps tooling only where you have real hours behind it.',
      },
      {
        question: 'Does a GitHub profile matter for ML roles?',
        answer: 'More than for most roles, because reviewers will open a repository to judge code quality. One clean, documented project beats a pinned list of abandoned experiments.',
      },
    ],
  },

  'cloud-engineer': {
    howToIntro:
      'Cloud engineer screening usually starts with a provider and a certification: which of AWS, Azure or GCP you actually run, and whether you hold the paper to prove it. After that, hiring managers look at the size of the estate you managed and whether you have moved anything real into it.',
    howTo: [
      {
        title: 'Put the provider and certification in the first screen',
        body: 'One primary cloud named clearly, with your certification level (Associate, Professional, Administrator) and status. Three clouds listed as equals usually means depth in none of them.',
      },
      {
        title: 'Quantify the estate',
        body: 'Accounts, subscriptions or projects, VPCs, monthly spend, number of workloads and regions. Infrastructure scale does not come across from a job title, and it is the fastest way to calibrate seniority.',
      },
      {
        title: 'Describe migrations concretely',
        body: 'What moved, from what, and how: lift-and-shift versus refactoring, wave planning, cutover windows and downtime avoided. "Migrated 40 workloads to AWS with zero unplanned downtime" is a complete story in one line.',
      },
      {
        title: 'Show infrastructure as code and networking depth',
        body: 'Terraform modules, CloudFormation or Bicep templates, VPC design, private endpoints, DNS and IAM. Networking is where cloud careers are won, and it is the most commonly omitted part of the resume.',
      },
      {
        title: 'Include cost and security work',
        body: 'Rightsizing, reserved capacity, storage tiering and the percentage saved; plus guardrails, encryption, least-privilege roles and the compliance regime you operated under, such as SOC 2 or HIPAA.',
      },
    ],
    mistakes: [
      {
        title: 'Certification with no hands-on work behind it',
        body: 'An Associate cert and no migration, pipeline or incident to show for it reads as exam preparation. Pair every credential with at least one system you built or ran.',
      },
      {
        title: '"Migrated to the cloud" with no detail',
        body: 'Readers cannot tell whether that meant two servers or two hundred. Name the workload count, the approach and what was left behind.',
      },
      {
        title: 'Skipping IAM and networking',
        body: 'Access policy, segmentation and identity are the layers most likely to be questioned in a cloud interview. Their absence suggests you worked above the layer you claim.',
      },
      {
        title: 'Listing all three providers with equal weight',
        body: 'It doubles the number of things you can be quizzed on while implying no production home. Choose a primary, and list the secondary as exposure.',
      },
    ],
    faq: [
      {
        question: 'Which cloud certification is most valuable?',
        answer: 'It depends on the postings you target: the AWS Solutions Architect Associate is the most widely recognised, Azure administrator credentials dominate in Microsoft shops, and GCP certifications matter in data-heavy estates. Read ten job ads for your target role and take the one they name most often.',
      },
      {
        question: 'Do employers actually require cloud certifications?',
        answer: 'Large enterprises, regulated industries and consultancies frequently filter on them; startups rarely do. A certification opens the door, but the migration you describe is what gets you hired through it.',
      },
      {
        question: 'How do I show cloud experience if my work was on-premises?',
        answer: 'Describe the overlap honestly — virtualisation, automation, networking, CI pipelines — then add the cloud work you have done through labs, a personal estate or a migration at work. The transferable skills are the same skills, so name them.',
      },
      {
        question: 'What technical skills belong in the skills section?',
        answer: 'IaC tooling, the provider services you used daily (compute, storage, networking, IAM), containers and orchestration, and one CI/CD system. Specific service names matter far more than adjectives like "expert".',
      },
      {
        question: 'Does a cloud engineer need a portfolio?',
        answer: 'Not in the traditional sense, but architecture diagrams, Terraform repositories and written postmortems all function as evidence. A link to a public IaC repo answers "have they really built this?" faster than any bullet.',
      },
    ],
  },

  'product-designer': {
    howToIntro:
      'Product designers are hired to own an area of a product, so the first question a screener asks is which surface you owned and what changed after you touched it. Your resume is read next to your case studies, and it should set the scope so the reviewer knows what they are evaluating.',
    howTo: [
      {
        title: 'Anchor every role to a product area',
        body: 'Checkout, onboarding, search, dashboards — name the surface and the team you sat with. "Designed features across the product" leaves the reader with nothing to picture.',
      },
      {
        title: 'Tie your work to product metrics',
        body: 'Activation, conversion, task success, retention, support volume. One metric connected to one design change is stronger than a portfolio-wide claim about impact.',
      },
      {
        title: 'Show the whole loop',
        body: 'Discovery interviews, prototypes tested, the shipped change and what you measured afterwards. Product teams hire designers who close the loop, not ones who hand off and move on.',
      },
      {
        title: 'Make systems contributions explicit',
        body: 'Components added, tokens defined, documentation written and adoption across squads. This is how your craft scales past one person, and it comes up in almost every panel interview.',
      },
      {
        title: 'Label your role in each case study',
        body: 'Who did the research, who did the visual work, who facilitated. Reviewers discount anything ambiguous, and an honest credit line makes the rest of the claim believable.',
      },
    ],
    mistakes: [
      {
        title: 'A portfolio with no scope statements on the resume',
        body: 'If the reviewer cannot tell what you owned, they cannot evaluate the case study link. Two lines of context per role prevent the whole page being read as "contributed".',
      },
      {
        title: 'Claiming outcomes you did not cause',
        body: 'Attaching a growth number to work you merely supported weakens every other claim on the page. Describe your slice of the result precisely.',
      },
      {
        title: 'Showing only research or only interface craft',
        body: 'Most product design roles expect both. If you are deliberately one or the other, say so in the summary rather than letting thin bullets imply you do both poorly.',
      },
      {
        title: 'A resume that undercuts the portfolio',
        body: 'The document itself is a design artifact. Broken hierarchy, an inconsistent grid or a PDF that fails to export is the first thing a design hiring manager notices.',
      },
    ],
    faq: [
      {
        question: 'How is a product designer resume different from a UI/UX one?',
        answer: 'Product designer roles are screened for ownership of a product area and measurable product outcomes, while many UI/UX postings weight research method and interaction craft. Read the posting and let its vocabulary — outcomes, systems, discovery — shape your bullets.',
      },
      {
        question: 'Do I absolutely need a portfolio?',
        answer: 'Yes. There is no version of a product design hire where nobody opens your work. Link three pieces from the resume header so it cannot be missed, and make sure they open on a phone without a login.',
      },
      {
        question: 'How do I show impact when my team never ran A/B tests?',
        answer: 'Use whatever evidence exists: before-and-after funnel numbers, usability test pass rates, reduced support tickets, or a stakeholder decision that changed after your research. Qualitative evidence is fine when it is described concretely.',
      },
      {
        question: 'Should freelance and contract work be included?',
        answer: 'Include it when it demonstrates product work: name the client sector, the surface you designed and the outcome. A short client list works well beneath a contract role of a few months.',
      },
      {
        question: 'How long should a product designer resume be?',
        answer: 'One page almost always, because the case studies carry the depth. Anything that needs a paragraph of narrative belongs behind the portfolio link.',
      },
    ],
  },

  'visual-designer': {
    howToIntro:
      'A visual designer resume is judged on craft before it is read: layout, type and colour decisions are visible in the document itself, and a design recruiter will notice them immediately. What they check next is the production stack and the kinds of assets you have shipped — campaigns, identities, packaging, editorial, social.',
    howTo: [
      {
        title: 'Let the page demonstrate the craft',
        body: 'A real type scale, deliberate spacing and a layout that exports cleanly to PDF. This is the one resume where the document itself is treated as a work sample.',
      },
      {
        title: 'Name the software precisely',
        body: 'Photoshop, Illustrator, InDesign, After Effects, Figma — plus prepress, print production or motion if relevant. Screening software matches on exact tool names, not on "Adobe Creative Suite".',
      },
      {
        title: 'Group work by output type',
        body: 'Brand identity, campaigns, editorial, packaging, digital and social, motion. Grouping tells a hiring manager the range you cover without a paragraph of explanation.',
      },
      {
        title: 'Quantify where the work has numbers',
        body: 'Campaign reach, engagement lift, print run sizes, number of SKUs, production timelines. Design metrics are scarce, so any you have are worth a line.',
      },
      {
        title: 'Link a portfolio that loads fast and shows process',
        body: 'Finals are expected; sketches, iterations and the constraint you worked under are what win the argument. Keep it openable without a plugin or a download.',
      },
    ],
    mistakes: [
      {
        title: 'Decoration instead of craft',
        body: 'Gradients, icon sets and an unusual font that fails to export undercut the claim that you control typography. Restraint is the demonstration.',
      },
      {
        title: 'Proficiency bars and percentage skill ratings',
        body: 'They invite an argument nobody can win — "85% Photoshop" means nothing to a reviewer. List the tools plainly and let the portfolio prove the level.',
      },
      {
        title: 'Final images with no context',
        body: 'A campaign visual with no client, constraint or your role in the team cannot be evaluated. Two lines of framing per project changes how the whole book reads.',
      },
      {
        title: 'Ignoring production realities',
        body: 'Brand guidelines, printer specifications, working with developers on web builds, legal review — these are the parts of the job employers actually live with. Silence on them makes the work look easier than it was.',
      },
    ],
    faq: [
      {
        question: 'How long should a visual designer resume be?',
        answer: 'One page, always. The portfolio carries the depth; the resume exists to state your software, your output types and where you have worked.',
      },
      {
        question: 'Which portfolio site should I use?',
        answer: 'Any site that loads quickly, shows work at full size and needs no account to view. What matters is that the link sits in the resume header, works on a phone, and orders your pieces strongest first.',
      },
      {
        question: 'Should I show print and digital work on the same resume?',
        answer: 'Yes, if both are genuine parts of your practice — just group them so the reader sees range deliberately rather than as confusion. If you are pivoting to digital, put digital first and let older print work sit lower.',
      },
      {
        question: 'Do design degrees matter?',
        answer: 'Less than the book. Formal training helps for editorial and brand roles at agencies, but a strong portfolio and evident typographic control outweigh the credential in most screening processes.',
      },
      {
        question: 'How do I present in-house versus agency work?',
        answer: 'Say which it was. Agency work signals range and pace; in-house work signals depth and ownership of a brand system. Hiring managers read the two very differently and want to know which they are getting.',
      },
    ],
  },

  'marketing-manager': {
    howToIntro:
      'Marketing managers are hired on numbers: growth, spend efficiency and the pipeline they produced. Recruiters scan first for the channels you owned and the results you reported against budget, then for the size of the team you led.',
    howTo: [
      {
        title: 'Report results per channel',
        body: 'Organic traffic and rankings, cost per acquisition, ROAS, email revenue, MQL to SQL rates. A channel list with no numbers attached is the most common failure in marketing resumes.',
      },
      {
        title: 'State the budget you were accountable for',
        body: 'Annual spend by channel, agency contracts you managed, headcount. Budget scope calibrates seniority faster than any adjective in the summary.',
      },
      {
        title: 'Name the stack',
        body: 'GA4, Google Ads, Meta Ads, HubSpot or Marketo, Salesforce, a CMS and your SEO tooling. These are exact-match terms in both the applicant tracking screen and the recruiter screen.',
      },
      {
        title: 'Show the funnel, not just the top',
        body: 'Awareness numbers matter only when they connect to leads, opportunities or revenue. Describe the handoff to sales and what your work was attributed to.',
      },
      {
        title: 'Describe the team and the cross-functional work',
        body: 'Direct reports, specialists and agencies you directed, plus how you worked with product and sales. Running marketing through other people is a different skill from running the campaigns yourself.',
      },
    ],
    mistakes: [
      {
        title: 'Vanity metrics as the headline',
        body: 'Impressions, likes and follower counts without a business outcome read as avoidance. If the only number you have is reach, pair it with what the reach was for.',
      },
      {
        title: 'Taking credit for the whole brand number',
        body: 'Attaching company-wide revenue to your bullets without stating your slice destroys credibility with any reviewer who has run marketing. Be precise about attribution.',
      },
      {
        title: 'No mention of budget or tooling',
        body: 'Screening for marketing roles filters on the platforms and on spend scope. Both missing suggests coordinator-level experience being presented as management.',
      },
      {
        title: 'Listing channels without the strategy',
        body: 'Five channels named and no prioritisation shown tells the reader you executed a plan someone else set. Include one decision about where to spend and why.',
      },
    ],
    faq: [
      {
        question: 'Which metrics belong on a marketing manager resume?',
        answer: 'The ones tied to revenue or cost: CAC, ROAS, conversion by channel, pipeline influenced, email revenue, organic growth. Two or three explained metrics beat a wall of unexplained percentages.',
      },
      {
        question: 'How do I show marketing experience when I had no budget?',
        answer: 'Describe scope in other terms: accounts managed, campaigns shipped per quarter, the content programme you ran, growth from a zero base. Then state plainly that spend was small — honesty about scale is read well.',
      },
      {
        question: 'Are marketing certifications worth listing?',
        answer: 'Google Ads and GA4 certifications, HubSpot and Meta credentials help early in a career and when the posting names them. They signal baseline literacy rather than strategy, so keep them below your results.',
      },
      {
        question: 'Should I include links to campaigns I worked on?',
        answer: 'Where you can, yes — a live landing page, a ranking improvement, an email you can describe. Anything a reviewer can verify converts a claim into evidence.',
      },
      {
        question: 'How long should a marketing manager resume be?',
        answer: 'Two pages is common at this level because channel results need room. Past two, you are listing activity rather than showing performance.',
      },
    ],
  },

  'sales-manager': {
    howToIntro:
      'Sales hiring is the most numerically screened job there is, and the first number is quota attainment. If your resume does not answer "did they hit their number, how big was it, and how many people did they get there with" inside ten seconds, it will not earn a second minute.',
    howTo: [
      {
        title: 'Put attainment at the front of every role',
        body: 'Percentage of quota carried, year over year, plus any top-performer recognition. A range is honest when a single year was weak — "105% to 130% across three years" tells the truth without hiding it.',
      },
      {
        title: 'Quantify the deal metrics',
        body: 'ARR or ACV, average deal size, win rate, sales cycle length and territory size. Those four figures let a sales leader reconstruct how you sold.',
      },
      {
        title: 'Separate new business from expansion and renewal',
        body: 'A hunter profile and a farmer profile are different hires, and mixing the numbers makes both unreadable. Label which kind of quota you carried.',
      },
      {
        title: 'Show the management scope',
        body: 'Reps carried, ramp time for new hires, team quota versus attainment, coaching or enablement you ran. Managing reps to number is the actual job being hired.',
      },
      {
        title: 'Name the process and the tooling',
        body: 'Salesforce or HubSpot, sequencing in Outreach or Salesloft, conversation intelligence, forecast cadence and your qualification method such as MEDDICC. It signals you have been run on a real sales process.',
      },
    ],
    mistakes: [
      {
        title: 'Responsibilities with no attainment figures',
        body: '"Managed a team of six account executives" says nothing about whether they hit plan. Sales leaders screen for that ratio first, and they notice its absence.',
      },
      {
        title: 'Claiming the team quota as your own',
        body: 'Inflated numbers collapse in the first reference call. State your personal carry and the team number separately; precision reads as seniority.',
      },
      {
        title: 'No CRM or process detail',
        body: 'If you cannot name the CRM, the pipeline stages you worked to and how you forecast, a reader assumes the operation was informal.',
      },
      {
        title: 'Unexplained gaps and short stints',
        body: 'Sales tenures are short and reviewers know it, but three roles in eighteen months with no reason reads as missed quota. A single honest line resolves it.',
      },
    ],
    faq: [
      {
        question: 'What do I put if I missed quota?',
        answer: 'Give the context in numbers: ramp period, territory carved from scratch, a downturn year, a quota set above the team average. Attainment of 80% with an explanation is far better than a number omitted.',
      },
      {
        question: 'Should I include awards and Presidents Club?',
        answer: 'Yes, when they are competitive and verifiable — they are one of the few signals that translate instantly between companies. Put them inline with the role rather than in a separate list nobody reads.',
      },
      {
        question: 'Do hiring managers care which CRM I know?',
        answer: 'They care that you can be productive in week one, and CRM familiarity is their proxy for that. Name the CRM and any sequencing or forecasting tools alongside it.',
      },
      {
        question: 'How do I write a sales resume if I was an individual contributor?',
        answer: 'Lead with your personal number: quota, attainment, pipeline generated, deals closed. Management candidates then add team results underneath; pure IC roles should keep the focus on your own book.',
      },
      {
        question: 'How long should a sales resume be?',
        answer: 'One to two pages, weighted toward results. Sales resumes tolerate dense numbers better than most, but every line should still carry a figure or a named account type.',
      },
    ],
  },

  'accountant': {
    howToIntro:
      'Accounting screeners verify two things early: that you can close the books accurately and on time, and which systems you have actually worked in. Month-end close ownership, reconciliations and the ERP come before any soft-skill claim, and a certification line changes how the rest of the page is read.',
    howTo: [
      {
        title: 'Describe the close you owned',
        body: 'Which accounts you reconciled, what you prepared, and how many days the close took. "Owned balance sheet reconciliations for 300+ accounts in a five-day close" is the sentence a controller wants to read.',
      },
      {
        title: 'Name the ERP and your Excel depth',
        body: 'NetSuite, SAP, Oracle, QuickBooks or Xero, plus the modelling you actually do — pivot models, lookups, Power Query. Vague spreadsheet claims are discounted instantly in this field.',
      },
      {
        title: 'State certification status honestly',
        body: 'CPA, ACCA or CMA with jurisdiction, or in progress with sections passed. Many postings filter on it, and an in-progress credential presented clearly is treated very differently from silence.',
      },
      {
        title: 'Quantify accuracy and efficiency',
        body: 'Audit adjustments, error rates, close days shortened, entities consolidated, staff supported through busy season. Accounting work is measured in precision, so give the measurements.',
      },
      {
        title: 'Name the technical areas you covered',
        body: 'Revenue recognition under ASC 606 or IFRS 15, SOX controls, intercompany, consolidation, tax preparation or FP&A support. Specialisation is how accountants move up, so make yours visible.',
      },
    ],
    mistakes: [
      {
        title: 'A duty list with no close cycle',
        body: 'Accounts payable, journal entries and reconciliations as separate task bullets reads as junior transactional work. Describe where each sat in the cycle and what you were accountable for signing off.',
      },
      {
        title: '"Proficient in Excel" with nothing behind it',
        body: 'Every accountant claims it and no reviewer can use it. Show the model you built or the process you automated instead of the adjective.',
      },
      {
        title: 'Leaving out certification status',
        body: 'If you are a CPA or working toward it, that line can decide whether a resume is opened at all. If you are not, check whether your target role expects one and address it early.',
      },
      {
        title: 'Listing an ERP you only observed',
        body: 'Being in the room during an implementation is not the same as running month-end in the system. Claim the level you can defend, because the interview will test it.',
      },
    ],
    faq: [
      {
        question: 'Do I need to be a CPA to get accountant jobs?',
        answer: 'Not for every role. Staff accountant and many industry positions value the candidacy itself and the close experience; public accounting and senior roles usually require it. Read the postings you want and state your status clearly.',
      },
      {
        question: 'How do I show experience if I only did AP or AR?',
        answer: 'Place the work inside the wider cycle: which reconciliations you touched, what you escalated, what month-end looked like from your seat. Then add the systems and any reporting you owned — that combination reads as progression.',
      },
      {
        question: 'Which accounting software should I list?',
        answer: 'The ERP first, then the ledger or reporting tools, then Excel depth and any close-management software. Match the ERP named in the job description if you have it, because that is often the filter.',
      },
      {
        question: 'How long should an accountant resume be?',
        answer: 'One page for staff and senior accountants, two for controllers and beyond. Recruiters screen for the ERP, the certification and close experience, so all three belong on page one.',
      },
      {
        question: 'Is public accounting or busy season experience worth highlighting?',
        answer: 'Yes, even briefly — it signals you have worked at pace under hard deadlines. Quantify it: entities handled, length of close, the audits you supported.',
      },
    ],
  },

  'hr-manager': {
    howToIntro:
      'HR managers are screened for a blend of compliance literacy and people outcomes, and the two are checked in different places on the page. Recruiters look first for the HRIS you have run and the employee relations work you have handled, with a credential such as SHRM-CP or CIPD signalling that you know where the legal lines are.',
    howTo: [
      {
        title: 'Name the HRIS and the modules you owned',
        body: 'Workday, SAP SuccessFactors, BambooHR or ADP, plus your ATS if you ran hiring — Greenhouse, Lever or similar. These are exact-match terms in HR screening.',
      },
      {
        title: 'Quantify the people outcomes',
        body: 'Turnover reduced, time-to-hire shortened, headcount supported, engagement score movement, offer acceptance rate. People work has more metrics than outsiders assume; use them.',
      },
      {
        title: 'Describe compliance work plainly',
        body: 'Leave law, EEO obligations, I-9 processes, policy updates, investigations and audit readiness. In regulated employers this is the part of the job that carries the risk, and it is heavily weighted.',
      },
      {
        title: 'Handle employee relations cases with care',
        body: 'Describe the type of issue, the process you followed and the resolution — never identifying details. How you handle confidentiality in your own resume is itself evidence of judgment.',
      },
      {
        title: 'Include the credential and its status',
        body: 'SHRM-CP, SHRM-SCP, PHR or CIPD level, with dates. Where the posting names a credential, mirror the wording exactly so the screen matches.',
      },
    ],
    mistakes: [
      {
        title: 'Disclosing confidential employee matters',
        body: 'Any detail that could identify a person tells every reader you would do the same to them. Case types and methods only, always.',
      },
      {
        title: 'Responsibility bullets with no metrics',
        body: '"Managed recruitment and onboarding" describes every HR generalist alive. Add the volume and the result: roles filled, days to hire, retention after ninety days.',
      },
      {
        title: 'Omitting the systems',
        body: 'HR screens filter on the HRIS and ATS by name. If you ran payroll in ADP or hired in Workday Recruiting, that sentence carries more weight than a paragraph on your philosophy.',
      },
      {
        title: 'Being vague about your scope in a small company',
        body: 'If you were the whole HR function, say so and list the areas you covered. An unstated generalist background reads as narrow specialist experience.',
      },
    ],
    faq: [
      {
        question: 'Which HR certification should I get?',
        answer: 'SHRM-CP or PHR in the US, CIPD level 5 or 7 in the UK and Ireland — match the credential your target market names in postings. They matter most when you are moving into generalist or business partner work from a single function.',
      },
      {
        question: 'How do I present HR experience from a company where I did everything?',
        answer: 'Group it: talent acquisition, employee relations, payroll and benefits, learning and development. The breadth is an asset if you label it, and the systems you used in each area prove the depth.',
      },
      {
        question: 'Do I need an HR degree?',
        answer: 'No. Many strong HR managers came from operations, recruiting or teaching. Lead with the outcomes you delivered and the compliance areas you own; the credential question resolves itself with the certification line.',
      },
      {
        question: 'How do I write about investigations and employee relations on a resume?',
        answer: 'Reference the volume and your role in the process — "conducted workplace investigations end to end following a documented protocol" — without subject, names or outcomes that identify anyone.',
      },
      {
        question: 'How long should an HR manager resume be?',
        answer: 'One page for most, two at senior level where programme work and organisational change need describing. Put the HRIS, the credential and one headline metric in the top third.',
      },
    ],
  },

  'teacher': {
    howToIntro:
      'Teaching resumes are screened for certification before they are read for pedagogy: the state, subject and grade band you are endorsed to teach decide which openings you are eligible for at all. Administrators then look for measurable student outcomes and evidence that you can run a classroom on day one.',
    howTo: [
      {
        title: 'Put licensure and endorsements at the top',
        body: 'State, subject area, grade band and status — active, pending or in progress with an expected date. Many districts filter on this line alone before a human sees the page.',
      },
      {
        title: 'State your setting precisely',
        body: 'Grade levels, subjects, class size, inclusion or resource rooms, AP or IB courses, and the school type. Context determines whether your results transfer, so provide it.',
      },
      {
        title: 'Quantify student outcomes',
        body: 'Proficiency growth, passage rates, graduation rates, AP score distributions, gains from an intervention group. Report them at class or cohort level only — aggregate, never individual.',
      },
      {
        title: 'Describe your classroom systems',
        body: 'How you run routines, manage behaviour, plan for differentiation and track data week to week. This is what a principal is picturing when they picture hiring you.',
      },
      {
        title: 'Name the platforms and the populations you have taught',
        body: 'Google Classroom, Canvas, Schoology, your gradebook and data systems, plus IEP, 504 and English learner experience. Postings filter for these constantly.',
      },
    ],
    mistakes: [
      {
        title: 'Burying certification below the fold',
        body: 'If a screener has to hunt for your licence, they may never get to your teaching. Move it into the header area alongside your contact details.',
      },
      {
        title: 'Pedagogy jargon with no results',
        body: 'A paragraph on your philosophy of differentiated instruction convinces nobody without the outcome it produced. Show the strategy, then show what happened.',
      },
      {
        title: 'Listing tasks instead of student growth',
        body: 'Planned lessons, graded work and attended meetings describe the employment contract. What students achieved under your instruction is the actual claim.',
      },
      {
        title: 'Leaving out IEP, 504 and English learner work',
        body: 'These are near-universal requirements in current postings and a daily reality in most classrooms. Their absence can read as a gap in experience rather than a gap in your resume.',
      },
    ],
    faq: [
      {
        question: 'How do I write a teaching resume with no classroom of my own?',
        answer: 'Lead with student teaching and practicum placements as real roles: grade level, mentor teacher, unit taught, outcomes you observed. Add substitute teaching, tutoring and coaching — they demonstrate classroom presence, which is what first-year hiring turns on.',
      },
      {
        question: 'Which certifications matter most?',
        answer: 'Your state licence for the subject and grade band first; then anything the postings name — ESL endorsement, special education, gifted, or subject-area training such as AP. Read five postings for your target and mirror their wording.',
      },
      {
        question: 'Should I put test scores and student data on my resume?',
        answer: 'Aggregate, de-identified results are fine and expected: class averages, pass rates, growth percentiles. Anything that could identify a student does not belong on any document.',
      },
      {
        question: 'How long should a teacher resume be?',
        answer: 'One page early on, two for experienced teachers with multiple settings and leadership roles. Certifications, grade levels and headline outcomes should all appear on page one.',
      },
      {
        question: 'Do I need a teaching portfolio?',
        answer: 'For some districts and most independent schools, yes — lesson units, assessments and a classroom management plan. For public school screening it usually comes after the interview, so the resume has to get you there first.',
      },
    ],
  },

  'nurse': {
    howToIntro:
      'Nursing recruiters screen on licensure and specialty before reading anything else: active RN licence, the units you have worked, and the charting system you know. After that they look for acuity and patient load, because those two numbers describe what your experience actually prepared you for.',
    howTo: [
      {
        title: 'Lead with licence and certifications',
        body: 'RN licence with state and NCLEX status, BLS, ACLS, PALS, and specialty credentials like CCRN or ONC with expiry dates. Many postings are filtered on an active licence before a recruiter opens the file.',
      },
      {
        title: 'Name the EMR you charted in',
        body: 'Epic, Cerner, Meditech or Allscripts. Charting competency is a hard requirement on a surprising number of postings, and leaving the system out costs otherwise strong resumes.',
      },
      {
        title: 'Quantify the unit',
        body: 'Average patient ratio, daily census, admissions and discharges per shift, bed count. A ratio tells an experienced manager exactly what pace you are used to.',
      },
      {
        title: 'Describe your clinical scope precisely',
        body: 'Procedures, medication administration, triage, charge nurse duties, precepting new hires and committee work. Vague duty lists are common in nursing resumes; specifics are what differentiate you.',
      },
      {
        title: 'State your setting and flexibility',
        body: 'Unit type and acuity — med-surg, telemetry, ED, ICU, OR, L&D — plus float or agency experience. Cross-training across units is a real asset in staffing-short environments.',
      },
    ],
    mistakes: [
      {
        title: 'Missing licence state or expired certifications',
        body: 'An expired BLS or an unlisted licence state is an automatic screen-out at most facilities. Put licence number, state and expiry wherever each applies.',
      },
      {
        title: 'Duty lists with no acuity context',
        body: 'Administered medications and monitored patients describes every nurse in the country. The ratio, the unit and the patient population are what make your experience legible.',
      },
      {
        title: 'Leaving out the charting systems',
        body: 'If you have never charted in the system the facility runs, they must train you on it. That is a real screening consideration, so make your EMR history easy to find.',
      },
      {
        title: 'Sharing anything close to patient information',
        body: 'Even well-intentioned detail can identify a patient and will be read as a confidentiality problem. Describe case types and volumes only — the same discipline you practise on the unit.',
      },
    ],
    faq: [
      {
        question: 'How do I write a nursing resume with no work experience?',
        answer: 'Clinical rotations count: unit, hours, procedures performed and your preceptor evaluation if you have one. Add CNA or patient care tech roles, volunteer work and certifications — new-grad resumes are read for licensure, placement quality and evidence of clinical judgment.',
      },
      {
        question: 'Which nursing certifications are worth listing?',
        answer: 'BLS is baseline; ACLS if you are targeting ED, ICU or telemetry; PALS for paediatrics; CCRN for critical care. Take the certifications named in the postings you want and match them.',
      },
      {
        question: 'Should I include my licence number?',
        answer: 'Yes. It makes verification immediate and signals you expect to be checked — which is the right signal in a licensed profession.',
      },
      {
        question: 'How long should a nurse resume be?',
        answer: 'One page for most clinical roles, even with ten years of service. Recruiters scan for licence, unit and EMR, so those three must be visible without turning the page.',
      },
      {
        question: 'Do I need to list every unit I floated to?',
        answer: 'No. List the units where you worked consistently and mention float experience as a single line. A long unit list without context reads as scattered rather than flexible.',
      },
    ],
  },
}

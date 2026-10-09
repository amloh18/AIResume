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
}

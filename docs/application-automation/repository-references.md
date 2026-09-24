# Repository References - Architectural Comparison

## Reference 1: Career-Copilot

**Repository**: https://github.com/mcherif/career-copilot

### Architecture

- **Stack**: Python, SQLite, Playwright, Ollama (local LLM)
- **Job Sources**: 17 sources (APIs, RSS, sitemaps, direct ATS)
- **Database**: SQLite (local-first)
- **AI**: Local Ollama for semantic evaluation

### Useful Ideas

1. **Multi-layered decision architecture**:
   - Layer 1: Deterministic filters (fast, cheap)
   - Layer 2: LLM semantic evaluation (local, private)
   - Layer 3: Human review
   
2. **Resume recommendation engine**:
   - Multiple resume profiles with tags
   - Best resume selected per job based on keyword matching
   - LLM-assisted selection when needed

3. **Remote eligibility classification**:
   - Geographic pattern detection
   - Region-based filtering (APAC-only, LATAM-only rejection)
   - Timezone compatibility

4. **ATS detection and prefill**:
   - Greenhouse, Lever, Ashby, Workable, Personio, Comeet, Recruitee, SmartRecruiters
   - Phone country code auto-set
   - react-select dropdown detection
   - EEO field handling

5. **Natural language assistant**:
   - Tool calling with live database access
   - Query pipeline stats, job details, schedule

### Adapt to BuildAIResume

1. **Decision layers** → Already implemented (hard filters → quality scoring → application modes)
2. **Resume recommendation** → Add to `candidateEvidenceEngine.ts`
3. **Remote eligibility** → Add to `hardFilters.ts`
4. **ATS detection patterns** → Use in Playwright automation

### Do NOT Use

- SQLite → Keep MongoDB
- Local Ollama → Keep Gemini API
- CLI interface → Keep web UI
- Windows Task Scheduler → Keep Docker-based scheduling

### BuildAIResume Destination

- Resume routing logic
- Enhanced remote eligibility filtering
- ATS detection patterns for Playwright

---

## Reference 2: JobSync

**Repository**: https://github.com/Gsync/jobsync

### Architecture

- **Stack**: Next.js, React, Prisma, SQLite, Tailwind
- **AI**: Ollama, OpenAI, DeepSeek, Gemini, OpenRouter
- **Features**: Application tracker, resume management, job discovery, AI assistant

### Useful Ideas

1. **Automated job discovery**:
   - Greenhouse company tracking by name
   - Lever company tracking with built-in directory (1,160+ companies)
   - Regional API resolution (lever.co vs eu.lever.co)
   - Local relevance scoring before AI matching

2. **MCP server integration**:
   - AI agents can add jobs directly
   - Tool calling with approval flow
   - Match scoring from chat

3. **Resume management**:
   - PDF export with templates
   - AI-powered resume review
   - Import from PDF/DOCX with structured extraction

4. **Job matching**:
   - Fast local relevance score
   - AI match on top candidates only (cost-bounded)

### Adapt to BuildAIResume

1. **Company directory for Lever** → Expand `LEVER_COMPANIES` list
2. **Regional API resolution** → Add to `LeverSource.ts`
3. **Relevance pre-scoring** → Add to `jobQualityScore.ts`
4. **Cost-bounded AI matching** → Pattern for AI usage

### Do NOT Use

- Prisma → Keep MongoDB
- SQLite → Keep MongoDB
- MCP server → Not needed for v1
- Multiple AI providers → Keep Gemini

### BuildAIResume Destination

- Expanded Lever company directory
- Regional API handling
- Pre-scoring before AI evaluation

---

## Reference 3: job-apply-ai

**Repository**: https://github.com/ShipItAndPray/job-apply-ai

### Architecture

- **Stack**: Python, Playwright, OpenAI
- **Platforms**: LinkedIn, Indeed, company career pages
- **Features**: AI form filling, anti-detection, application tracker

### Useful Ideas

1. **Platform-specific automation**:
   - LinkedIn Easy Apply flow
   - Indeed Apply flow
   - Career page handling (Greenhouse, Lever, Workday, Ashby, iCIMS)

2. **AI form filling**:
   - Profile + skills summary + job context
   - Handles custom/unexpected questions
   - Multi-step form navigation

3. **Anti-detection measures**:
   - Random delays
   - Character-by-character typing
   - Browser fingerprint masking
   - Realistic viewport/user agent

4. **Dry run mode**:
   - Search and preview without applying
   - Test new ATS flows safely

5. **Application tracker**:
   - CSV logging with status, timestamps, errors

### Adapt to BuildAIResume

1. **ATS-specific flows** → Implement as Playwright adapters
2. **AI form filling pattern** → Use Gemini for semantic questions
3. **Dry-run mode** → Add to application pipeline
4. **Screenshot on error** → Add to application artifacts

### Do NOT Use

- Anti-detection fingerprint evasion → Not needed for legitimate applications
- LinkedIn automation → Risky, focus on direct ATS
- OpenAI → Keep Gemini

### BuildAIResume Destination

- Playwright ATS adapters
- Dry-run mode
- Error screenshots

---

## Reference 4: job-application-agent

**Repository**: https://github.com/AchyutKulkarni/job-application-agent

### Architecture

- **Stack**: Node.js, Playwright, Zod, pdf-parse
- **Features**: Modular agent, ATS handlers, RAG, resume routing, Google Sheets sync

### Useful Ideas

1. **Modular architecture**:
   - Separate agents, ATS handlers, services, storage
   - Configuration via environment variables
   - State persistence between runs

2. **ATS handlers**:
   - Ashby, Greenhouse, Lever, Workable, Breezy, Rippling, SmartRecruiters, Jobvite
   - Isolated by provider

3. **Resume routing**:
   - Keyword rules for selection
   - Optional LLM assistance
   - Resume PDF parsing for candidate profile

4. **Application artifacts**:
   - Screenshots, fill audits, cover letters
   - Persistent between runs

5. **Fill audits**:
   - Log what was filled, what was skipped
   - Review before submission

### Adapt to BuildAIResume

1. **ATS handler pattern** → Implement as adapter classes
2. **Fill audits** → Add to ApplicationJourney
3. **Resume routing logic** → Adapt to Master CV system
4. **State persistence** → Already have MongoDB

### Do NOT Use

- Google Sheets sync → Keep MongoDB
- Local file storage → Keep R2
- Ollama → Keep Gemini

### BuildAIResume Destination

- ATS adapter architecture
- Fill audit logging
- Resume routing

---

## Reference 5: job-apply-agent (sudheerbez)

**Repository**: https://github.com/sudheerbez/job-apply-agent

### Architecture

- **Stack**: Python, Playwright, OpenAI
- **Platforms**: LinkedIn, Indeed, career pages
- **Features**: Configurable filters, dry-run, screenshots on error

### Useful Ideas

1. **Configurable filters**:
   - Company blacklist
   - Title pattern matching
   - Experience level filtering
   - Job type filtering

2. **Dry run mode**:
   - Search and preview jobs
   - No applications submitted

3. **Screenshots on error**:
   - Capture browser state when something goes wrong
   - Debug automation failures

4. **Deduplication**:
   - Never apply to same job twice

### Adapt to BuildAIResume

1. **Configurable filters** → Already in `hardFilters.ts`
2. **Dry-run mode** → Add to application pipeline
3. **Error screenshots** → Add to application artifacts
4. **Deduplication** → Already in job model (canonicalId)

### Do NOT Use

- Anti-detection measures → Not needed
- LinkedIn/Indeed automation → Risky
- OpenAI → Keep Gemini

### BuildAIResume Destination

- Enhanced filter configuration
- Dry-run mode
- Error screenshots

---

## Reference 6: NotiApply

**Analysis**: Already documented in `docs/application-automation/notiapply-analysis.md`

### Key Takeaways

1. **Worker architecture** → Already adapted
2. **Queue system** → Already have ApplicationQueue
3. **ATS adapters** → Need to implement
4. **Browser isolation** → Critical for Playwright
5. **Manual intervention** → NEEDS_USER_ACTION pattern

---

## Summary Table

| Feature | Career-Copilot | JobSync | job-apply-ai | job-application-agent | job-apply-agent | BuildAIResume Status |
|---------|----------------|---------|--------------|----------------------|-----------------|---------------------|
| Job sources | 17 | Greenhouse, Lever | LinkedIn, Indeed | Multiple | LinkedIn, Indeed | 8 sources ✅ |
| Deduplication | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Canonical ID |
| Freshness | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ Score system |
| Quality scoring | ✅ LLM | ✅ Local | ❌ | ❌ | ❌ | ✅ Multi-dimensional |
| Hard filters | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ Complete |
| Resume routing | ✅ | ✅ | ❌ | ✅ | ❌ | ⚠️ Basic |
| ATS detection | ✅ | ❌ | ✅ | ✅ | ✅ | ⚠️ In model only |
| Playwright | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ Not implemented |
| Dry-run | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ Not implemented |
| Fill audits | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ Not implemented |
| Error screenshots | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ Not implemented |
| Email | ✅ Digest | ❌ | ❌ | ✅ Nodemailer | ❌ | ✅ Stalwart ready |
| Company watchlists | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ Not implemented |
| MCP integration | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ Not needed v1 |

## Recommended Integrations

### Priority 0 (Critical)

1. **Company watchlists** - Simple model + API + scheduler integration
2. **Cross-source dedup** - Logic layer on existing provenance

### Priority 1 (High Value)

3. **Application dry-run** - Mode flag in automation pipeline
4. **Fill audits** - Logging in ApplicationJourney
5. **Error screenshots** - Capture on Playwright failures

### Priority 2 (Useful)

6. **Resume routing** - Best resume selection per job
7. **Expanded Lever directory** - More companies
8. **Regional API handling** - Lever EU support

### Priority 3 (Future)

9. **MCP server** - AI agent integration
10. **Natural language assistant** - Tool calling with DB access

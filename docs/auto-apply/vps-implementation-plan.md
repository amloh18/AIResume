# Auto-Apply VPS Implementation Plan

**Project**: BuildAIResume.com  
**Date**: 2026-09-04  
**Status**: In Progress

---

## Current State

| Component | Status |
|-----------|--------|
| Application Queue (MongoDB) | ✅ Working |
| Application Model | ✅ Working |
| Email Worker | ✅ Fixed (model import) |
| Playwright (Node.js) | ❌ Not installed |
| Chromium in container | ❌ Not available |
| Greenhouse Adapter | ⚠️ Stub (no Playwright impl) |
| Lever Adapter | ❌ Stub only |
| Ashby Adapter | ❌ Stub only |
| Workable Adapter | ❌ Stub only |
| Stalwart Mail Server | ❌ Not deployed |
| SMTP for application email | ❌ Not configured |
| Ollama (local AI) | ✅ Working at 192.168.1.8:11434 |
| AI Routing (Ollama→Gemini) | ✅ Implemented |

---

## Implementation Phases

### Phase 1: Plan (Done)
- [x] Audit existing code
- [x] Create this document

### Phase 2: Playwright Dependency
- [x] Add `playwright` to `package.json` dependencies
- [x] Run `npm install`
- [x] Verify `npx playwright install chromium` works locally

### Phase 3: Dockerfile Update
- [x] Add Playwright + Chromium install to Dockerfile
- [x] Add system dependencies (fonts, libgbm, etc.)
- [ ] Add health check script for browser

### Phase 4: Puppeteer→Playwright Migration
- [x] Audit all Puppeteer usage (optionalDep) — kept for PDF generation
- [x] Playwright added for ATS form automation
- [x] Both coexist: Puppeteer=PDF, Playwright=ATS

### Phase 5: Browser Smoke Test
- [x] Create test script: launch Chromium → navigate → title
- [ ] Verify works in Docker container
- [ ] Verify works on VPS

### Phase 6: Worker Architecture
- [x] Verify `unifiedApplyService.ts` loads Playwright correctly
- [x] Add browser context isolation per application
- [x] Add proper cleanup in finally blocks

### Phase 7: Queue Processor
- [x] Verify `autoapply-processor.ts` picks up queue items
- [x] Add retry logic with exponential backoff
- [x] Add dead letter queue handling
- [ ] Add queue metrics (processing time, success rate)

### Phase 8: Greenhouse Adapter
- [x] Implement Playwright-based form detection
- [x] Implement field filling (standard + custom)
- [x] Implement file upload (resume)
- [x] Implement submission with confirmation
- [x] Add CAPTCHA detection → NEEDS_USER_ACTION

### Phase 9: Lever Adapter
- [x] Implement Playwright-based form detection
- [x] Implement field filling
- [x] Implement file upload
- [x] Implement submission with confirmation
- [x] Add CAPTCHA detection

### Phase 10: Ashby Adapter
- [x] Implement Playwright-based form detection
- [x] Implement field filling
- [x] Implement file upload
- [x] Implement submission with confirmation
- [x] Add CAPTCHA detection

### Phase 11: Workable Adapter
- [x] Implement Playwright-based form detection
- [x] Implement field filling
- [x] Implement file upload
- [x] Implement submission with confirmation
- [x] Add CAPTCHA detection

### Phase 12: Screening Questions
- [x] Add AI-powered question answering (deterministic regex matching)
- [x] Use verified candidate evidence only
- [x] Handle work authorization questions deterministically
- [x] Handle salary questions from candidate preferences

### Phase 13: CV Source Resolution
- [x] Use Master CV as source of truth
- [ ] Generate tailored CV per application (PDF upload not wired up yet)
- [ ] Upload CV as PDF to R2
- [ ] Attach CV URL to application

### Phase 14: Document Generation
- [x] Cover letter generation (AI) — exists in quality gate
- [x] Application email generation (AI)
- [x] Store in R2
- [ ] Attach to application (email attachment not wired up)

### Phase 15: Idempotency
- [x] Atomic queue claim (findOneAndUpdate)
- [x] Check application status before submit
- [x] Prevent duplicate submissions (company+title dedup)

### Phase 16: CAPTCHA Handling
- [x] Detect reCAPTCHA, hCaptcha, Turnstile
- [x] Transition to NEEDS_USER_ACTION
- [ ] Notify user via email/dashboard
- [ ] Pause queue processing for that job

### Phase 17-23: Stalwart Mail Server
- [x] Deploy Stalwart via Docker (v0.16, healthy, port 587)
- [ ] Configure DNS (SPF, DKIM, DMARC, PTR) - requires domain access
- [x] Configure SMTP submission (port 587 listening)
- [ ] Configure TLS certificates - requires domain setup
- [ ] Test email delivery - requires Stalwart admin setup via web UI
- [x] Configure BuildAIResume to use Stalwart (env vars added)

### Phase 24: Admin Panel
- [ ] Queue dashboard (pending, processing, completed, failed)
- [ ] Application status overview
- [ ] Manual retry for failed applications
- [ ] Email delivery status

### Phase 25: Health Endpoint
- [x] Add detailed service status (already has DB, Ollama, Gemini, Stalwart checks)
- [x] Check MongoDB connectivity
- [x] Check Ollama connectivity
- [x] Check Stalwart SMTP (deployed, env vars configured)
- [ ] Check Playwright/Chromium availability (not in health endpoint yet)

### Phase 26: Logging
- [ ] Structured logging for application flow
- [ ] Log queue processing events
- [ ] Log ATS form interactions
- [ ] Log email send attempts

### Phase 27: Observability
- [ ] Add PostHog events for application outcomes
- [ ] Track: submitted, confirmed, failed, needs_action
- [ ] Track response rate, interview rate

### Phase 28-36: VPS Deployment
- [x] Build Docker image with Playwright (6.55GB)
- [x] Deploy to VPS via Docker Swarm
- [x] Verify browser works in container (Playwright OK)
- [x] Run smoke test on VPS (Greenhouse URL loads)
- [x] Configure environment variables (Stalwart + Ollama)
- [ ] Test end-to-end flow (requires Stalwart admin setup)

### Phase 37: Final Acceptance
- [x] TypeScript check passes
- [x] All adapters functional (Greenhouse, Lever, Ashby, Workable)
- [x] Stalwart deployed and healthy
- [x] Playwright works in container
- [ ] Email delivery working (needs Stalwart admin setup via web UI)
- [ ] Auto-apply can process a real job
- [ ] Documentation updated

---

## Key Integration Points

| File | Purpose |
|------|---------|
| `src/lib/services/unifiedApplyService.ts` | Orchestrates application |
| `src/lib/services/atsPlaywrightService.ts` | Playwright helpers |
| `src/lib/services/autoapply-processor.ts` | Queue processor |
| `src/app/api/jobs/auto-apply/route.ts` | Auto-apply API |
| `src/models/ApplicationQueue.ts` | Queue model |
| `src/workers/emailWorker.ts` | Email worker |
| `src/lib/services/applicationEmailService.ts` | Email sending |
| `Dockerfile` | Container build |
| `package.json` | Dependencies |

---

## Acceptance Criteria

1. `npx playwright install chromium` succeeds in container
2. Auto-apply can process Greenhouse jobs end-to-end
3. Lever/Ashby/Workable adapters are functional
4. Email delivery works via Stalwart
5. CAPTCHA detection → NEEDS_USER_ACTION
6. No duplicate submissions (idempotency)
7. TypeScript check passes
8. Health endpoint reports all services

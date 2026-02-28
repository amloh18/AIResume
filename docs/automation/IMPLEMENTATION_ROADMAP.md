# CV Circle – Implementation Roadmap

**12-Week Phased Delivery Plan**

---

## Overview

This roadmap breaks the automation system into **3 phases** over **12 weeks**.

Each phase has:
- Clear deliverables
- Go/No-Go checkpoints
- Success criteria

---

## Phase 1: MVP (Weeks 1–6)

**Goal:** Ship basic job matching with assisted apply flow

### Week 1-2: Foundation

#### Week 1: Setup & Preferences
- [ ] Create MongoDB collections
- [ ] Build job preferences API
- [ ] Build preferences UI
- [ ] Implement UK-only validation

**Deliverable:** Users can save job preferences

**Success Criteria:**
- Preferences save successfully
- UK-only constraint enforced
- UI is responsive

---

#### Week 2: Job Ingestion
- [ ] Integrate Google Talent API
- [ ] Build job fetch cron job
- [ ] Implement normalization logic
- [ ] Add deduplication

**Deliverable:** Jobs fetched daily from Google Talent

**Success Criteria:**
- 100+ jobs fetched per day
- Duplicates removed
- Jobs stored with correct schema

---

### Week 3-4: Matching & Display

#### Week 3: Matching Engine
- [ ] Build score computation logic
- [ ] Implement weighted algorithm (40/30/20/10)
- [ ] Create job_matches collection
- [ ] Build rematch trigger on preference change

**Deliverable:** Match scores computed for all users

**Success Criteria:**
- Scores between 0-100
- Breakdown shows component scores
- Rematching works on preference update

---

#### Week 4: Jobs Page UI
- [ ] Build Jobs Dashboard page
- [ ] Create jobs list/table
- [ ] Add filtering & sorting
- [ ] Implement pagination

**Deliverable:** Jobs page shows matched jobs

**Success Criteria:**
- Jobs display correctly
- Filters work
- Sorting works
- Mobile responsive

---

### Week 5-6: Assisted Apply

#### Week 5: Document Generation
- [ ] Integrate LLM API (OpenAI/Claude)
- [ ] Build resume tailoring prompts
- [ ] Build cover letter generation
- [ ] Store resume versions

**Deliverable:** LLM generates tailored documents

**Success Criteria:**
- Documents generated in < 30s
- Keywords aligned with job
- Cost tracked

---

#### Week 6: Assisted Apply Flow
- [ ] Build application creation API
- [ ] Create application modal/form
- [ ] Implement review & submit UI
- [ ] Update tracker statuses

**Deliverable:** Users can apply with assistance

**Success Criteria:**
- Application created successfully
- Documents attached
- Tracker updated
- User can review before submit

---

### Phase 1 Go/No-Go Checkpoint

**Required:**
- [ ] Users can set preferences
- [ ] Jobs fetched and matched
- [ ] Assisted apply flow works end-to-end
- [ ] No critical bugs
- [ ] Performance acceptable (< 2s page load)

**Optional:**
- Admin UI (deferred to Phase 2)
- Full auto mode (deferred to Phase 3)

---

## Phase 2: Production Hardening (Weeks 7–9)

**Goal:** Add admin controls, multiple sources, automation safeguards

### Week 7: Multi-Source Integration

- [ ] Integrate SerpApi (Google Jobs UK)
- [ ] Add source detection logic
- [ ] Implement source prioritization
- [ ] Build source toggle in admin

**Deliverable:** Jobs fetched from 2+ sources

**Success Criteria:**
- SerpApi fetches 200+ jobs/day
- Source attribution correct
- Admin can enable/disable sources

---

### Week 8: Admin Dashboard

- [ ] Build admin layout
- [ ] Create metrics dashboard
- [ ] Add job sources manager
- [ ] Build automation rules editor
- [ ] Implement kill switches

**Deliverable:** Admin can monitor and control system

**Success Criteria:**
- Metrics display correctly
- Kill switches work immediately
- Rules updates apply instantly

---

### Week 9: Automation Safeguards

- [ ] Implement daily limit enforcement
- [ ] Build failure cooldown logic
- [ ] Add cost tracking
- [ ] Implement budget caps
- [ ] Build audit logging

**Deliverable:** System enforces limits and tracks costs

**Success Criteria:**
- Daily limits enforced server-side
- Cooldown triggers after 3 failures
- Costs tracked per provider
- Auto-disable at budget threshold

---

### Phase 2 Go/No-Go Checkpoint

**Required:**
- [ ] Multi-source job fetching works
- [ ] Admin dashboard functional
- [ ] Kill switches verified
- [ ] Cost caps enforced
- [ ] Audit logs complete

**Optional:**
- Apify integration (nice-to-have)
- Advanced analytics

---

## Phase 3: Scale & Automation (Weeks 10–12)

**Goal:** Enable full auto-apply, optimize performance, launch Power tier

### Week 10: Playwright Automation

- [ ] Build Playwright workers
- [ ] Implement Greenhouse handler
- [ ] Implement Lever handler
- [ ] Implement Workable handler
- [ ] Add ATS detection

**Deliverable:** Playwright can submit applications to supported ATS

**Success Criteria:**
- Greenhouse apply success rate > 80%
- Lever apply success rate > 80%
- Workable apply success rate > 80%
- Failures logged with reason

---

### Week 11: Full Auto Mode

- [ ] Build auto-apply queue
- [ ] Implement mode selection UI
- [ ] Add Power tier gating
- [ ] Build user disclosure modal
- [ ] Implement priority queue

**Deliverable:** Power tier users can enable full auto

**Success Criteria:**
- Mode toggle works
- Tier enforcement correct
- Disclosure shown on first enable
- Priority queue gives faster processing

---

### Week 12: Analytics & Launch Prep

- [ ] Build KPI dashboard
- [ ] Add metrics grid to Jobs page
- [ ] Implement charts (match distribution, sources, trends)
- [ ] Add performance monitoring
- [ ] Final QA & load testing

**Deliverable:** System ready for public launch

**Success Criteria:**
- KPIs display correctly
- Charts render smoothly
- No memory leaks
- Load test: 1000 users, 10k jobs, 1k applications/day

---

### Phase 3 Go/No-Go Checkpoint

**Required:**
- [ ] Full auto-apply works
- [ ] All ATS handlers functional
- [ ] KPI dashboards live
- [ ] Performance optimized
- [ ] Load tests passed
- [ ] Security audit passed

---

## Post-Launch (Week 13+)

### Immediate (Weeks 13-14)
- Monitor error rates
- Fix critical bugs
- Gather user feedback
- Optimize costs

### Short-Term (Weeks 15-20)
- Add Apify integration
- Support additional ATS (Ashby, BambooHR)
- Implement email notifications
- Build mobile app (optional)

### Long-Term (Weeks 21+)
- Expand to EU countries
- Add LinkedIn integration (without login)
- Build recruiter dashboard
- Implement AI interview prep

---

## Risk Management

### High-Risk Items
1. **Playwright reliability**
   - Mitigation: Extensive testing, fallback to assisted mode
2. **API cost overruns**
   - Mitigation: Strict budget caps, monitoring, alerts
3. **ATS blocking**
   - Mitigation: Respectful rate limits, headful mode, human-like delays
4. **User churn on failures**
   - Mitigation: Clear communication, failure cooldown, assisted mode default

### Medium-Risk Items
1. Job quality (too many irrelevant jobs)
2. User confusion on automation settings
3. Performance degradation at scale
4. Integration complexity with multiple ATS

---

## Success Metrics

### Week 6 (Phase 1 Complete)
- 50 beta users
- 100+ jobs matched per user
- 10+ assisted applications submitted
- 0 critical bugs

### Week 9 (Phase 2 Complete)
- 200 beta users
- Multi-source fetching stable
- Admin controls verified
- Cost < £500/month

### Week 12 (Phase 3 Complete)
- 500 users (100 Power tier)
- 1000+ applications/week
- 80%+ success rate
- Cost < £2000/month
- Break-even trajectory confirmed

---

## Rollback Plan

If any phase fails Go/No-Go:

1. **Disable new features** via feature flags
2. **Communicate to users** about delay
3. **Fix issues** in dedicated sprint
4. **Re-test** before proceeding
5. **Document learnings** for future phases

---

## Dependencies & Blockers

### External Dependencies
- Google Talent API access (Week 2)
- SerpApi account (Week 7)
- LLM API access (Week 5)
- MongoDB Atlas (Week 1)
- Redis Cloud (Week 5)

### Internal Dependencies
- Design system finalized (Week 1)
- Auth system ready (Week 1)
- Payment integration (Week 11, for Power tier)

### Potential Blockers
- ATS changes their form structure → Update handlers
- API rate limits hit → Increase tier or optimize
- Playwright detection by ATS → Add more human-like behavior
- Budget exceeded → Pause automation, optimize costs

---

**End of IMPLEMENTATION_ROADMAP.md**

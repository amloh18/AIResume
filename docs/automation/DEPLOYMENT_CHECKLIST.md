# Jobs Dashboard - Deployment Checklist

**Last Updated:** February 5, 2026

---

## Pre-Deployment Checklist

### ✅ Code Completion
- [x] All files created (31 files, 7,154 lines)
- [x] TypeScript types defined
- [x] Services implemented
- [x] API routes created
- [x] UI components built
- [x] Styling added
- [x] Documentation complete

### ⏳ Integration Requirements

#### 1. Authentication (CRITICAL)
- [ ] Replace `'x-user-id': 'temp-user-id'` with real auth
- [ ] Update all API routes to use authenticated user ID
- [ ] Add middleware for protected routes
- [ ] Test with real user sessions

**Files to Update:**
- `src/app/api/jobs/preferences/route.ts`
- `src/app/api/jobs/list/route.ts`
- `src/app/api/jobs/metrics/route.ts`
- `src/app/api/automation/settings/route.ts`
- `src/app/api/applications/auto/route.ts`
- `src/components/dashboard/JobsDashboard.tsx` (fetch headers)

#### 2. Database Setup (CRITICAL)
- [ ] Verify `@/lib/db` export exists and works
- [ ] Create MongoDB collections:
  - `users`
  - `job_preferences`
  - `jobs`
  - `job_matches`
  - `applications`
  - `resume_versions`
  - `automation_settings`
  - `admin_rules`
  - `api_usage`
  - `audit_logs`
- [ ] Apply indexes (see schema in automation-guide.md)
- [ ] Seed admin_rules with defaults
- [ ] Create test data for development

**Script to Create Indexes:**
```javascript
// Run in MongoDB shell or migration script
db.job_preferences.createIndex({ userId: 1 });
db.jobs.createIndex({ title: 1, company: 1, location: 1 }, { unique: true });
db.jobs.createIndex({ createdAt: -1 });
db.jobs.createIndex({ atsType: 1 });
db.job_matches.createIndex({ userId: 1, jobId: 1 }, { unique: true });
db.job_matches.createIndex({ userId: 1, score: -1 });
db.applications.createIndex({ userId: 1, jobId: 1 }, { unique: true });
db.applications.createIndex({ userId: 1, createdAt: -1 });
db.applications.createIndex({ status: 1 });
db.automation_settings.createIndex({ userId: 1 }, { unique: true });
db.audit_logs.createIndex({ createdAt: -1 });
db.audit_logs.createIndex({ actor: 1, createdAt: -1 });
```

#### 3. Dependencies (CRITICAL)
```bash
# Install required packages
npm install recharts lucide-react mongodb

# Verify versions
npm list recharts lucide-react mongodb
```

#### 4. Environment Variables
Create/update `.env.local`:
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority

# Job Sources (for future use)
GOOGLE_TALENT_API_KEY=your_google_talent_key
SERPAPI_KEY=your_serpapi_key

# LLM (for future use)
OPENAI_API_KEY=your_openai_key

# Feature Flags
JOBS_DASHBOARD_ENABLED=true
AUTOMATION_ENABLED=false  # Start with false, enable after testing
```

---

## Testing Checklist

### Unit Tests (Recommended)
- [ ] Test JobMatchingService.computeScore()
- [ ] Test AutomationService.checkDailyLimit()
- [ ] Test ApplicationService.updateApplicationStatus()
- [ ] Test preference validation

### Integration Tests (Critical)
- [ ] Test full API flow: preferences → jobs list → metrics
- [ ] Test auto-apply eligibility checks
- [ ] Test tier-based permission enforcement
- [ ] Test daily limit enforcement

### Manual Testing (Critical)
- [ ] Navigate to /dashboard/jobs
- [ ] Verify metrics load
- [ ] Test filters and sorting
- [ ] Open job detail modal
- [ ] Toggle dark/light mode
- [ ] Test on mobile/tablet/desktop
- [ ] Verify no console errors

### Performance Testing
- [ ] Page load time < 2 seconds
- [ ] Metrics API response < 1 second
- [ ] Jobs list API response < 1 second
- [ ] Filter debounce works (300ms)
- [ ] No memory leaks on component unmount

---

## Deployment Steps

### 1. Staging Deployment
```bash
# 1. Commit all changes
git add .
git commit -m "feat: Add Jobs Dashboard with automation system"

# 2. Push to staging branch
git push origin staging

# 3. Deploy to staging environment
# (Your deployment process here)

# 4. Run smoke tests
curl https://staging.cvcircle.com/dashboard/jobs
curl https://staging.cvcircle.com/api/jobs/metrics
```

### 2. Staging Validation
- [ ] All pages load without errors
- [ ] API endpoints return valid data
- [ ] Authentication works
- [ ] Dark/light theme toggles correctly
- [ ] Mobile responsiveness confirmed
- [ ] No broken links or images

### 3. Production Deployment
Only proceed if ALL staging tests pass.

```bash
# 1. Merge to main
git checkout main
git merge staging

# 2. Tag release
git tag -a v1.0.0-jobs-dashboard -m "Jobs Dashboard Release"
git push origin main --tags

# 3. Deploy to production
# (Your production deployment process)

# 4. Monitor for errors
# Check logs, error tracking, performance metrics
```

---

## Post-Deployment Checklist

### Immediate (First Hour)
- [ ] Verify /dashboard/jobs is accessible
- [ ] Check error logs (should be zero errors)
- [ ] Monitor API response times
- [ ] Test with 5-10 real users

### First Day
- [ ] Collect user feedback
- [ ] Monitor database performance
- [ ] Check API usage/costs
- [ ] Review audit logs

### First Week
- [ ] Analyze metrics:
  - Jobs matched per user (target: 50+)
  - Average match score (target: 70+)
  - Page load performance
  - API error rate (target: <1%)
- [ ] Address any critical bugs
- [ ] Optimize slow queries if needed

---

## Rollback Plan

If critical issues are discovered:

### Quick Rollback (Option 1)
```bash
# Hide Jobs menu item
# Update OptimizedNavigation.tsx to comment out Jobs item
git checkout HEAD~1 src/components/dashboard/OptimizedNavigation.tsx
git commit -m "hotfix: Temporarily hide Jobs dashboard"
git push origin main
```

### Full Rollback (Option 2)
```bash
# Revert to previous release
git revert <commit-hash>
git push origin main
```

### Feature Flag Disable (Option 3)
Set environment variable:
```
JOBS_DASHBOARD_ENABLED=false
```

Then update page to check flag:
```typescript
// src/app/dashboard/jobs/page.tsx
export default function JobsPage() {
  if (process.env.JOBS_DASHBOARD_ENABLED !== 'true') {
    return <div>Feature temporarily unavailable</div>;
  }
  // ... rest of code
}
```

---

## Known Limitations (v1)

### Current Limitations
1. **UK-only:** Jobs and auto-apply restricted to United Kingdom
2. **No job fetching yet:** Jobs must be seeded manually or via admin
3. **No Playwright automation yet:** Auto-apply creates draft, doesn't submit
4. **Temporary auth:** Using placeholder user IDs (must integrate real auth)

### Future Enhancements (Phase 2+)
- Actual job fetching from Google Talent API, SerpApi
- Playwright automation for ATS (Greenhouse, Lever, Workable)
- Email notifications for matched jobs
- Admin dashboard for monitoring
- Multi-country expansion (EU)
- LinkedIn integration (read-only)

---

## Support Contacts

**Technical Issues:**
- Backend: [Your Name/Team]
- Frontend: [Your Name/Team]
- DevOps: [Your Name/Team]

**Documentation:**
- See `docs/automation/` for full specifications
- See `docs/automation/QUICK_REFERENCE.md` for quick help

---

## Success Metrics (KPIs)

### Week 1 Targets
- 50+ users access Jobs page
- 100+ jobs matched per user
- 0 critical bugs
- Page load < 2 seconds
- API error rate < 1%

### Month 1 Targets
- 200+ active users
- 10+ applications per user
- 80%+ match quality (avg score)
- <5% user churn on automation failures

### Break-Even
- ~50 paying users (Auto/Power tiers)
- Cost per application < £0.50
- Monthly spend < £2,000

---

## Emergency Procedures

### Critical Bug Detected
1. Assess severity (P0, P1, P2)
2. If P0: Immediately disable feature via flag
3. Notify team via Slack/email
4. Create hotfix branch
5. Fix, test, deploy
6. Post-mortem document

### Database Performance Issue
1. Check slow query logs
2. Add missing indexes
3. Optimize aggregation pipelines
4. Consider caching (Redis)

### API Rate Limit Hit
1. Check usage in admin dashboard
2. Increase tier/quota if needed
3. Implement request throttling
4. Add retry logic with exponential backoff

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Verified By:** _____________  

---

*For questions or issues, refer to `docs/automation/` or contact the engineering team.*

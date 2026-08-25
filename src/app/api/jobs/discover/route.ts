import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import type {
  JobListing,
  PaginatedJobsResponse,
} from '@/types/automation-schema';
import { MATCH_SCORE_THRESHOLDS } from '@/types/automation-schema';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobDiscoveryService, type DiscoveryCriteria, type DiscoveryRegion } from '@/lib/services/jobDiscoveryService';
import { GlobalJobService } from '@/lib/services/globalJobService';

const validRegions: DiscoveryRegion[] = ['UK', 'India', 'Global'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    const countriesParam = searchParams.get('countries');
    const countryList = countriesParam ? countriesParam.split(',').map((c) => c.trim()).filter(Boolean) : [];

    let region: DiscoveryRegion = 'Global';
    if (countryList.length === 1 && countryList[0].toLowerCase() === 'india') {
      region = 'India';
    } else if (countryList.length === 1 && (countryList[0].toLowerCase() === 'united kingdom' || countryList[0].toLowerCase() === 'uk')) {
      region = 'UK';
    } else {
      const regionParam = (searchParams.get('region') || 'Global') as DiscoveryRegion;
      region = validRegions.includes(regionParam) ? regionParam : 'Global';
    }

    const keywords = searchParams
      .get('keywords')
      ?.split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const remoteOnly = searchParams.get('remoteOnly') === 'true';

    const companyFilter = searchParams.get('companies')?.split(',').filter(Boolean) || [];
    const locationFilter = searchParams.get('locations')?.split(',').filter(Boolean) || [];
    const sourceFilter = searchParams.get('sources')?.split(',').filter(Boolean) || [];
    const atsFilter = searchParams.get('atsTypes')?.split(',').filter(Boolean) || [];
    const workplaceFilter = searchParams.get('workplaceType')?.split(',').filter(Boolean) || [];
    const roleFilter = searchParams.get('roles')?.split(',').filter(Boolean) || [];
    const jobTypeFilter = searchParams.get('jobTypes')?.split(',').filter(Boolean) || [];
    const experienceFilter = searchParams.get('experienceLevel')?.split(',').filter(Boolean) || [];
    const datePostedFilter = searchParams.get('datePosted');
    const sponsorsVisaFilter = searchParams.get('sponsorsVisa') === 'true';

    const matchScoreMax = parseInt(
      searchParams.get('matchScoreMax') || '100'
    );
    const sortBy = (searchParams.get('sortBy') || 'matchScore') as string;
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Resolve the real user (session cookie or extension token); may be null.
    const auth = await authenticateRequest(request);
    const userId = auth?.userId;

    const criteria: DiscoveryCriteria = {
      region,
      keywords,
      remoteOnly,
      limit,
      ingestLimit: Math.max(60, limit * 2),
    };

    // Get user's profile version for cache isolation
    let profileVersion: number | undefined;
    if (userId) {
      try {
        const { JobSearchProfileService } = await import('@/lib/services/jobSearchProfileService');
        const profile = await JobSearchProfileService.getProfile(userId);
        if (profile) {
          profileVersion = profile.profileVersion;
        }
      } catch {
        // Profile may not exist yet, that's okay
      }
    }

    const discovered = await JobDiscoveryService.fetchAndStore(criteria, userId, profileVersion);

    if (discovered.length === 0) {
      return NextResponse.json({
        jobs: [],
        total: 0,
        page,
        pageSize: limit,
        hasMore: false,
      } as PaginatedJobsResponse);
    }

    const scores = await JobDiscoveryService.scoreDiscoveredJobs(discovered, userId);

    let listings: JobListing[] = discovered.map((job) => {
      const scored = scores.get(job.externalId);
      return {
        _id: job._id.toString(),
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency || undefined,
        matchScore: scored?.score || 0,
        matchBreakdown: scored?.breakdown,
        source: (job.source || 'discovery') as any,
        atsType: job.atsType,
        applyUrl: job.applyUrl,
        postedDate: job.postedDate || (job as any).postedAt,
        userId: userId || '',
        country: job.country,
        description: job.description,
        keywords: job.keywords,
      };
    });

    // Fetch global jobs (complete manual/extension jobs from all users)
    try {
      const portalJobTitles = discovered.map(j => j.title);
      const portalJobCompanies = discovered.map(j => j.company);

      const globalJobs = await GlobalJobService.getGlobalJobs({
        excludeUserIds: userId ? [userId] : [],
        limit: 100,
        portalJobTitles,
        portalJobCompanies,
      });

      // Merge global jobs into listings (dedup already handled by GlobalJobService)
      listings = [...listings, ...globalJobs];
    } catch (err) {
      console.warn('Failed to fetch global jobs:', err);
    }

    // Exclude jobs the user has already passed/dismissed
    if (userId) {
      try {
        const { getDb } = await import('@/lib/db');
        const db = await getDb();
        const passedDocs = await db
          .collection('passed_jobs')
          .find({ userId: new ObjectId(userId) })
          .toArray();
        const passedExternalIds = new Set(passedDocs.map((d: any) => d.externalId));
        if (passedExternalIds.size > 0) {
          listings = listings.filter((job) => {
            const discoveredJob = discovered.find((d) => d._id.toString() === job._id);
            return !discoveredJob || !passedExternalIds.has(discoveredJob.externalId);
          });
        }
      } catch (err) {
        console.warn('[API] Failed to load passed jobs:', err);
      }
    }

    if (companyFilter.length > 0) {
      listings = listings.filter((job) =>
        companyFilter.some((c) => job.company.toLowerCase().includes(c.toLowerCase()))
      );
    }

    if (locationFilter.length > 0) {
      listings = listings.filter((job) =>
        locationFilter.some((loc) => job.location.toLowerCase().includes(loc.toLowerCase()))
      );
    }

    if (sourceFilter.length > 0) {
      listings = listings.filter((job) => sourceFilter.includes(job.source));
    }

    if (atsFilter.length > 0) {
      listings = listings.filter((job) => atsFilter.includes(job.atsType));
    }

    // Country and Continent / Macro-Region list filter
    if (countryList.length > 0 && !countryList.includes('Worldwide / Remote')) {
      listings = listings.filter((job) => {
        if (job.remote) return true;
        const locLower = (job.location || '').toLowerCase();
        const countryLower = (job.country || '').toLowerCase();

        return countryList.some((c) => {
          const cLower = c.toLowerCase();

          // Continents & Macro Regions
          if (cLower === 'europe') {
            return (
              locLower.includes('europe') ||
              locLower.includes('uk') ||
              locLower.includes('united kingdom') ||
              locLower.includes('london') ||
              locLower.includes('manchester') ||
              locLower.includes('edinburgh') ||
              locLower.includes('germany') ||
              locLower.includes('berlin') ||
              locLower.includes('munich') ||
              locLower.includes('frankfurt') ||
              locLower.includes('france') ||
              locLower.includes('paris') ||
              locLower.includes('netherlands') ||
              locLower.includes('amsterdam') ||
              locLower.includes('ireland') ||
              locLower.includes('dublin') ||
              locLower.includes('switzerland') ||
              locLower.includes('zurich') ||
              locLower.includes('geneva') ||
              locLower.includes('spain') ||
              locLower.includes('madrid') ||
              locLower.includes('barcelona') ||
              locLower.includes('sweden') ||
              locLower.includes('stockholm') ||
              locLower.includes('poland') ||
              locLower.includes('warsaw') ||
              locLower.includes('italy') ||
              locLower.includes('rome') ||
              locLower.includes('milan')
            );
          }

          if (cLower === 'asia') {
            return (
              locLower.includes('asia') ||
              locLower.includes('india') ||
              locLower.includes('bangalore') ||
              locLower.includes('bengaluru') ||
              locLower.includes('mumbai') ||
              locLower.includes('delhi') ||
              locLower.includes('pune') ||
              locLower.includes('hyderabad') ||
              locLower.includes('noida') ||
              locLower.includes('gurgaon') ||
              locLower.includes('chennai') ||
              locLower.includes('china') ||
              locLower.includes('beijing') ||
              locLower.includes('shanghai') ||
              locLower.includes('shenzhen') ||
              locLower.includes('guangzhou') ||
              locLower.includes('hangzhou') ||
              locLower.includes('hong kong') ||
              locLower.includes('singapore') ||
              locLower.includes('japan') ||
              locLower.includes('tokyo') ||
              locLower.includes('south korea') ||
              locLower.includes('seoul') ||
              locLower.includes('taiwan') ||
              locLower.includes('vietnam') ||
              locLower.includes('thailand') ||
              locLower.includes('indonesia') ||
              locLower.includes('malaysia') ||
              locLower.includes('philippines')
            );
          }

          if (cLower === 'north america') {
            return (
              locLower.includes('north america') ||
              locLower.includes('united states') ||
              locLower.includes('usa') ||
              locLower.includes('us') ||
              locLower.includes('canada') ||
              locLower.includes('toronto') ||
              locLower.includes('vancouver') ||
              locLower.includes('montreal') ||
              locLower.includes('mexico') ||
              locLower.includes('san francisco') ||
              locLower.includes('new york') ||
              locLower.includes('austin') ||
              locLower.includes('seattle') ||
              locLower.includes('boston') ||
              locLower.includes('los angeles') ||
              locLower.includes('chicago')
            );
          }

          if (cLower === 'latin america' || cLower === 'south america') {
            return (
              locLower.includes('latin america') ||
              locLower.includes('south america') ||
              locLower.includes('brazil') ||
              locLower.includes('são paulo') ||
              locLower.includes('argentina') ||
              locLower.includes('buenos aires') ||
              locLower.includes('chile') ||
              locLower.includes('colombia') ||
              locLower.includes('bogota')
            );
          }

          if (cLower === 'middle east & africa' || cLower === 'middle east') {
            return (
              locLower.includes('middle east') ||
              locLower.includes('uae') ||
              locLower.includes('united arab emirates') ||
              locLower.includes('dubai') ||
              locLower.includes('abu dhabi') ||
              locLower.includes('saudi') ||
              locLower.includes('riyadh') ||
              locLower.includes('qatar') ||
              locLower.includes('doha') ||
              locLower.includes('israel') ||
              locLower.includes('tel aviv') ||
              locLower.includes('south africa') ||
              locLower.includes('egypt') ||
              locLower.includes('cairo')
            );
          }

          if (cLower === 'asia-pacific' || cLower === 'apac' || cLower === 'oceania') {
            return (
              locLower.includes('apac') ||
              locLower.includes('asia-pacific') ||
              locLower.includes('oceania') ||
              locLower.includes('australia') ||
              locLower.includes('sydney') ||
              locLower.includes('melbourne') ||
              locLower.includes('brisbane') ||
              locLower.includes('new zealand') ||
              locLower.includes('auckland') ||
              locLower.includes('singapore')
            );
          }

          // Specific Countries
          if (cLower === 'china') {
            return (
              locLower.includes('china') ||
              locLower.includes('beijing') ||
              locLower.includes('shanghai') ||
              locLower.includes('shenzhen') ||
              locLower.includes('guangzhou') ||
              locLower.includes('hangzhou') ||
              locLower.includes('hong kong') ||
              locLower.includes('chengdu') ||
              locLower.includes('wuhan') ||
              countryLower.includes('china') ||
              countryLower === 'cn'
            );
          }

          if (cLower === 'india') {
            return (
              locLower.includes('india') ||
              locLower.includes('bangalore') ||
              locLower.includes('bengaluru') ||
              locLower.includes('mumbai') ||
              locLower.includes('pune') ||
              locLower.includes('delhi') ||
              locLower.includes('hyderabad') ||
              locLower.includes('noida') ||
              locLower.includes('gurgaon') ||
              locLower.includes('gurugram') ||
              locLower.includes('chennai') ||
              locLower.includes('kolkata') ||
              countryLower.includes('india') ||
              countryLower === 'in'
            );
          }

          if (cLower === 'united kingdom' || cLower === 'uk') {
            return (
              locLower.includes('uk') ||
              locLower.includes('united kingdom') ||
              locLower.includes('london') ||
              locLower.includes('manchester') ||
              locLower.includes('edinburgh') ||
              locLower.includes('bristol') ||
              locLower.includes('birmingham') ||
              locLower.includes('cambridge') ||
              locLower.includes('oxford') ||
              countryLower.includes('uk') ||
              countryLower.includes('united kingdom') ||
              countryLower === 'gb'
            );
          }

          if (cLower === 'united states' || cLower === 'us' || cLower === 'usa') {
            return (
              locLower.includes('us') ||
              locLower.includes('usa') ||
              locLower.includes('united states') ||
              locLower.includes('san francisco') ||
              locLower.includes('new york') ||
              locLower.includes('austin') ||
              locLower.includes('seattle') ||
              locLower.includes('boston') ||
              locLower.includes('los angeles') ||
              locLower.includes('chicago') ||
              locLower.includes('ca') ||
              locLower.includes('ny') ||
              locLower.includes('tx') ||
              locLower.includes('wa') ||
              countryLower.includes('us') ||
              countryLower.includes('united states')
            );
          }

          if (cLower === 'germany') {
            return locLower.includes('germany') || locLower.includes('berlin') || locLower.includes('munich') || locLower.includes('frankfurt') || locLower.includes('hamburg') || countryLower.includes('germany') || countryLower === 'de';
          }

          if (cLower === 'canada') {
            return locLower.includes('canada') || locLower.includes('toronto') || locLower.includes('vancouver') || locLower.includes('montreal') || locLower.includes('ottawa') || countryLower.includes('canada') || countryLower === 'ca';
          }

          if (cLower === 'singapore') {
            return locLower.includes('singapore') || countryLower.includes('singapore') || countryLower === 'sg';
          }

          if (cLower === 'australia') {
            return locLower.includes('australia') || locLower.includes('sydney') || locLower.includes('melbourne') || locLower.includes('brisbane') || locLower.includes('perth') || countryLower.includes('australia') || countryLower === 'au';
          }

          if (cLower === 'united arab emirates' || cLower === 'uae') {
            return locLower.includes('dubai') || locLower.includes('abu dhabi') || locLower.includes('uae') || locLower.includes('united arab emirates') || countryLower.includes('uae') || countryLower === 'ae';
          }

          if (cLower === 'netherlands') {
            return locLower.includes('netherlands') || locLower.includes('amsterdam') || locLower.includes('rotterdam') || countryLower.includes('netherlands') || countryLower === 'nl';
          }

          if (cLower === 'ireland') {
            return locLower.includes('ireland') || locLower.includes('dublin') || locLower.includes('cork') || countryLower.includes('ireland') || countryLower === 'ie';
          }

          if (cLower === 'switzerland') {
            return locLower.includes('switzerland') || locLower.includes('zurich') || locLower.includes('geneva') || countryLower.includes('switzerland') || countryLower === 'ch';
          }

          if (cLower === 'france') {
            return locLower.includes('france') || locLower.includes('paris') || locLower.includes('lyon') || countryLower.includes('france') || countryLower === 'fr';
          }

          if (cLower === 'japan') {
            return locLower.includes('japan') || locLower.includes('tokyo') || locLower.includes('osaka') || locLower.includes('kyoto') || countryLower.includes('japan') || countryLower === 'jp';
          }

          if (cLower === 'south korea') {
            return locLower.includes('korea') || locLower.includes('seoul') || countryLower.includes('korea') || countryLower === 'kr';
          }

          return locLower.includes(cLower) || countryLower.includes(cLower);
        });
      });
    }

    // Workplace Type filter (remote, hybrid, onsite)
    if (workplaceFilter.length > 0) {
      listings = listings.filter((job) => {
        const locLower = (job.location || '').toLowerCase();
        const titleLower = (job.title || '').toLowerCase();
        const descLower = (job.description || '').toLowerCase();
        const isRemote = job.remote || locLower.includes('remote') || titleLower.includes('remote');
        const isHybrid = locLower.includes('hybrid') || descLower.includes('hybrid');
        const isOnsite = !isRemote && !isHybrid;

        return (
          (workplaceFilter.includes('remote') && isRemote) ||
          (workplaceFilter.includes('hybrid') && isHybrid) ||
          (workplaceFilter.includes('onsite') && isOnsite)
        );
      });
    }

    // Role filter
    if (roleFilter.length > 0) {
      listings = listings.filter((job) => {
        const titleLower = (job.title || '').toLowerCase();
        const descLower = (job.description || '').toLowerCase();
        const keywordsLower = (job.keywords || []).map((k) => k.toLowerCase());

        return roleFilter.some((role) => {
          const rLower = role.toLowerCase();
          if (rLower === 'full stack') return titleLower.includes('full stack') || titleLower.includes('fullstack') || keywordsLower.includes('fullstack') || keywordsLower.includes('full stack');
          if (rLower === 'frontend') return titleLower.includes('frontend') || titleLower.includes('front-end') || titleLower.includes('ui') || titleLower.includes('react') || titleLower.includes('web developer');
          if (rLower === 'backend') return titleLower.includes('backend') || titleLower.includes('back-end') || titleLower.includes('node') || titleLower.includes('python') || titleLower.includes('java') || titleLower.includes('golang');
          if (rLower === 'react developer') return titleLower.includes('react') || titleLower.includes('next.js') || keywordsLower.includes('react');
          if (rLower === 'devops / cloud') return titleLower.includes('devops') || titleLower.includes('cloud') || titleLower.includes('sre') || titleLower.includes('infrastructure') || titleLower.includes('aws') || titleLower.includes('kubernetes');
          if (rLower === 'data / ai engineer') return titleLower.includes('data') || titleLower.includes('ai') || titleLower.includes('ml') || titleLower.includes('machine learning') || titleLower.includes('analytics');
          if (rLower === 'machine learning') return titleLower.includes('machine learning') || titleLower.includes('ml') || titleLower.includes('deep learning') || titleLower.includes('ai engineer');
          if (rLower === 'mobile (ios/android)') return titleLower.includes('mobile') || titleLower.includes('ios') || titleLower.includes('android') || titleLower.includes('react native') || titleLower.includes('flutter');
          if (rLower === 'product manager') return titleLower.includes('product manager') || titleLower.includes('product owner') || titleLower.includes('pm');
          if (rLower === 'software engineer') return titleLower.includes('software engineer') || titleLower.includes('software developer') || titleLower.includes('sde');
          if (rLower === 'qa / automation') return titleLower.includes('qa') || titleLower.includes('test') || titleLower.includes('quality') || titleLower.includes('sdet');
          if (rLower === 'ui/ux designer') return titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux') || titleLower.includes('product designer');

          return (
            titleLower.includes(rLower) ||
            keywordsLower.some((k) => k.includes(rLower)) ||
            descLower.includes(rLower)
          );
        });
      });
    }

    // Job Type filter (fulltime, contract, parttime, internship)
    if (jobTypeFilter.length > 0) {
      listings = listings.filter((job) => {
        const text = `${job.title} ${job.description || ''}`.toLowerCase();
        return jobTypeFilter.some((jt) => {
          if (jt === 'fulltime') return text.includes('full-time') || text.includes('full time') || (!text.includes('contract') && !text.includes('internship') && !text.includes('part-time'));
          if (jt === 'contract') return text.includes('contract') || text.includes('freelance') || text.includes('temporary') || text.includes('contractor');
          if (jt === 'parttime') return text.includes('part-time') || text.includes('part time');
          if (jt === 'internship') return text.includes('intern') || text.includes('internship') || text.includes('trainee');
          return false;
        });
      });
    }

    // Experience Level & Education filter (entry, mid, senior, lead, bachelor, master)
    if (experienceFilter.length > 0) {
      listings = listings.filter((job) => {
        const text = `${job.title} ${job.description || ''}`.toLowerCase();
        return experienceFilter.some((exp) => {
          if (exp === 'entry') return text.includes('junior') || text.includes('entry') || text.includes('graduate') || text.includes('associate') || text.includes('0-2') || text.includes('1-2') || text.includes('fresher');
          if (exp === 'mid') return text.includes('mid') || text.includes('intermediate') || text.includes('3-5') || text.includes('2-4') || text.includes('3+ years');
          if (exp === 'senior') return text.includes('senior') || text.includes('sr.') || text.includes('5-8') || text.includes('5+') || text.includes('6+ years') || text.includes('7+ years');
          if (exp === 'lead') return text.includes('lead') || text.includes('principal') || text.includes('staff') || text.includes('architect') || text.includes('director') || text.includes('head of') || text.includes('8+');
          if (exp === 'bachelor') return text.includes('bachelor') || text.includes('bs') || text.includes('ba') || text.includes('b.tech') || text.includes('b.e.') || text.includes('degree');
          if (exp === 'master') return text.includes('master') || text.includes('ms') || text.includes('phd') || text.includes('ph.d') || text.includes('m.tech') || text.includes('postgraduate');
          return true;
        });
      });
    }

    // Date Posted filter (24h, 7d, 30d)
    if (datePostedFilter && datePostedFilter !== 'all') {
      const now = Date.now();
      const maxAgeMs =
        datePostedFilter === '24h'
          ? 24 * 60 * 60 * 1000
          : datePostedFilter === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

      listings = listings.filter((job) => {
        const raw = job.postedDate || (job as any).postedAt || (job as any).createdAt;
        if (!raw) return true;
        const postedTime = new Date(raw).getTime();
        if (isNaN(postedTime) || postedTime <= 0) return true;
        return now - postedTime <= maxAgeMs;
      });
    }

    // Sponsors Visa filter
    if (sponsorsVisaFilter) {
      listings = listings.filter((job) => {
        const text = `${job.title} ${job.description || ''} ${job.location}`.toLowerCase();
        return (
          text.includes('visa') ||
          text.includes('sponsor') ||
          text.includes('relocation') ||
          text.includes('tier 2') ||
          text.includes('h1b') ||
          text.includes('global') ||
          job.remote
        );
      });
    }

    // Saved Only filter (from query param)
    const savedOnlyFilter = searchParams.get('savedOnly') === 'true';
    if (savedOnlyFilter) {
      try {
        if (!userId) {
          listings = [];
        } else {
          const { getDb } = await import('@/lib/db');
          const db = await getDb();

          let userQuery: any = { userId: String(userId) };
          try {
            if (ObjectId.isValid(userId)) {
              userQuery = {
                $or: [{ userId: new ObjectId(userId) }, { userId: String(userId) }],
              };
            }
          } catch {
            userQuery = { userId: String(userId) };
          }

          const [savedJobsDocs, jobApps] = await Promise.all([
            db.collection('jobs').find(userQuery).toArray(),
            db.collection('jobapplications').find(userQuery).toArray(),
          ]);

          const savedIds = new Set<string>();
          const savedUrls = new Set<string>();
          const savedCompanyTitles = new Set<string>();

          for (const j of savedJobsDocs) {
            if (j._id) savedIds.add(j._id.toString());
            if (j.id) savedIds.add(String(j.id));
            if (j.jobId) savedIds.add(String(j.jobId));
            if (j.jobUrl) savedUrls.add(j.jobUrl.trim().toLowerCase());
            if (j.sourceUrl) savedUrls.add(j.sourceUrl.trim().toLowerCase());
            if (j.company && (j.jobTitle || j.title)) {
              const comp = (j.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              const tit = ((j.jobTitle || j.title) || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              savedCompanyTitles.add(`${comp}___${tit}`);
            }
          }

          for (const a of jobApps) {
            if (a._id) savedIds.add(a._id.toString());
            if (a.id) savedIds.add(String(a.id));
            if (a.jobId) savedIds.add(String(a.jobId));
            if (a.jobUrl) savedUrls.add(a.jobUrl.trim().toLowerCase());
            if (a.sourceUrl) savedUrls.add(a.sourceUrl.trim().toLowerCase());
            if (a.company && (a.jobTitle || a.title)) {
              const comp = (a.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              const tit = ((a.jobTitle || a.title) || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              savedCompanyTitles.add(`${comp}___${tit}`);
            }
          }

          if (savedIds.size > 0 || savedUrls.size > 0 || savedCompanyTitles.size > 0) {
            listings = listings.filter((job) => {
              if (savedIds.has(job._id) || (job.id && savedIds.has(job.id))) return true;
              if (job.applyUrl && savedUrls.has(job.applyUrl.trim().toLowerCase())) return true;
              const comp = (job.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              const tit = (job.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              return savedCompanyTitles.has(`${comp}___${tit}`);
            });
          } else {
            listings = [];
          }
        }
      } catch (err) {
        console.warn('Failed to filter saved jobs on server:', err);
        listings = [];
      }
    }

    const minScore = parseInt(
      searchParams.get('matchScoreMin') || String(MATCH_SCORE_THRESHOLDS.DISPLAY_MIN)
    );
    listings = listings.filter(
      (job) => job.matchScore >= minScore && job.matchScore <= matchScoreMax
    );

    // Keyword search filter — filter results by search text
    if (keywords && keywords.length > 0) {
      listings = listings.filter((job) => {
        const titleLower = (job.title || '').toLowerCase();
        const companyLower = (job.company || '').toLowerCase();
        const descLower = (job.description || '').toLowerCase();
        const locLower = (job.location || '').toLowerCase();
        const keywordsLower = ((job as unknown as Record<string, unknown>).keywords as string[] || []).map((k: string) => k.toLowerCase());

        return keywords.some((kw) => {
          const kwLower = kw.toLowerCase();
          return (
            titleLower.includes(kwLower) ||
            companyLower.includes(kwLower) ||
            descLower.includes(kwLower) ||
            locLower.includes(kwLower) ||
            keywordsLower.some((k) => k.includes(kwLower))
          );
        });
      });
    }

    const dir = sortOrder === 'asc' ? 1 : -1;
    listings.sort((a, b) => {
      if (sortBy === 'postedDate') {
        const rawA = a.postedDate || (a as any).postedAt || (a as any).createdAt;
        const rawB = b.postedDate || (b as any).postedAt || (b as any).createdAt;
        const tA = rawA ? new Date(rawA).getTime() : 0;
        const tB = rawB ? new Date(rawB).getTime() : 0;
        return (tB - tA) * (sortOrder === 'asc' ? -1 : 1);
      }
      if (sortBy === 'salary') {
        const salA = a.salaryMax || a.salaryMin || 0;
        const salB = b.salaryMax || b.salaryMin || 0;
        return (salB - salA) * (sortOrder === 'asc' ? -1 : 1);
      }
      if (sortBy === 'company') {
        return (a.company || '').localeCompare(b.company || '') * dir;
      }
      return (b.matchScore - a.matchScore) * (sortOrder === 'asc' ? -1 : 1);
    });

    const total = listings.length;
    const start = (page - 1) * limit;
    const paginated = listings.slice(start, start + limit);

    return NextResponse.json({
      jobs: paginated,
      total,
      page,
      pageSize: limit,
      hasMore: start + limit < total,
    } as PaginatedJobsResponse);
  } catch (error: any) {
    console.error('[API] GET /api/jobs/discover error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch jobs',
        },
      },
      { status: 500 }
    );
  }
}
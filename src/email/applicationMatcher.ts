import { Db, ObjectId } from 'mongodb';

export interface EmailMetadataForMatching {
  senderEmail: string;
  senderDomain: string;
  subject: string;
  body: string;
}

export interface ApplicationMatchResult {
  applicationId: string;
  companyName: string;
  jobTitle: string;
  confidence: number;
}

export async function matchEmailToApplication(
  db: Db,
  userId: string,
  emailData: EmailMetadataForMatching
): Promise<ApplicationMatchResult | null> {
  const appsColl = db.collection('applications');
  const jobsColl = db.collection('jobs');

  const userApps = await appsColl.find({ userId: userId }).toArray();
  if (userApps.length === 0) return null;

  const jobIds = userApps.map((a) => {
    try {
      return new ObjectId(a.jobId);
    } catch {
      return a.jobId;
    }
  });

  const jobs = await jobsColl.find({ _id: { $in: jobIds } }).toArray();
  const jobMap = new Map(jobs.map((j) => [String(j._id), j]));

  const combinedEmailText = `${emailData.subject} ${emailData.body} ${emailData.senderEmail}`.toLowerCase();

  let bestMatch: ApplicationMatchResult | null = null;
  let highestScore = 0;

  for (const app of userApps) {
    const job = jobMap.get(String(app.jobId));
    if (!job) continue;

    let score = 0;
    const companyNorm = (job.company?.name || '').toLowerCase();
    const titleNorm = (job.title || '').toLowerCase();

    // 1. Company name match
    if (companyNorm && combinedEmailText.includes(companyNorm)) {
      score += 60;
    }

    // 2. Sender domain match
    if (job.company?.domain && emailData.senderDomain.includes(job.company.domain)) {
      score += 30;
    }

    // 3. Job title match
    if (titleNorm && combinedEmailText.includes(titleNorm)) {
      score += 20;
    }

    if (score > highestScore && score >= 60) {
      highestScore = score;
      bestMatch = {
        applicationId: String(app._id),
        companyName: job.company?.name || 'Company',
        jobTitle: job.title || 'Role',
        confidence: Math.min(1.0, score / 100),
      };
    }
  }

  return bestMatch;
}

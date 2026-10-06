import User from '@/models/User';
import { getConnection } from '@/lib/database';
import { DEFAULT_CV_TAILORING_MODE, parseCvTailoringMode, type CvTailoringMode } from './tailoringMode';

export async function getUserCvTailoringMode(userId: string): Promise<CvTailoringMode> {
  try {
    await getConnection();
    const user = await User.findById(userId).select('settings.cvTailoringMode').lean();
    return parseCvTailoringMode((user as { settings?: { cvTailoringMode?: unknown } } | null)?.settings?.cvTailoringMode);
  } catch (error) {
    console.error('Failed to load CV tailoring mode, using default:', error);
    return DEFAULT_CV_TAILORING_MODE;
  }
}

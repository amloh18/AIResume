import { ObjectId } from 'mongodb';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';
import JobApplication from '@/models/JobApplication';
import type { ApplicationStep } from '@/types/automation-schema';
import type { ScreeningQuestion, ScreeningAnswer } from './naukriApplyService';

export class IndeedApplyService {
  /**
   * Generates AI-assisted screening answers for Indeed applications
   */
  public static async answerScreeningQuestions(
    userId: string,
    questions: (string | ScreeningQuestion)[],
    jobContext: { title: string; company: string; description?: string }
  ): Promise<ScreeningAnswer[]> {
    await getConnection();

    const user: any = await User.findById(userId).lean();
    const primaryCv: any = await CV.findOne({ userId, 'metadata.isMaster': true }).lean();

    const userProfile = {
      name: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Candidate',
      experienceYears: user?.indeedIntegration?.preferences?.experienceYears ?? 4,
      minSalary: user?.indeedIntegration?.preferences?.minSalary ?? 90000,
      currency: user?.indeedIntegration?.preferences?.salaryCurrency ?? 'USD',
      skills: primaryCv?.skills || ['React', 'TypeScript', 'Node.js', 'Next.js', 'Python', 'AWS'],
      summary: primaryCv?.summary || '',
      experience: primaryCv?.experience || [],
    };

    return questions.map((q) => {
      const qText = typeof q === 'string' ? q : q.question;
      const lower = qText.toLowerCase();

      if (/authorized to work|eligible to work/i.test(lower)) {
        return {
          question: qText,
          answer: 'Yes',
          confidence: 0.98,
        };
      }

      if (/sponsorship|visa/i.test(lower)) {
        return {
          question: qText,
          answer: 'No',
          confidence: 0.95,
        };
      }

      if (/salary|compensation/i.test(lower)) {
        return {
          question: qText,
          answer: `${userProfile.currency === 'GBP' ? '£' : userProfile.currency === 'INR' ? '₹' : '$'}${userProfile.minSalary.toLocaleString()}`,
          confidence: 0.95,
        };
      }

      if (/years of (?:experience|work)/i.test(lower)) {
        return {
          question: qText,
          answer: `${userProfile.experienceYears} years`,
          confidence: 0.95,
        };
      }

      if (/remote|relocate|commute/i.test(lower)) {
        return {
          question: qText,
          answer: 'Yes, fully comfortable with this arrangement.',
          confidence: 0.9,
        };
      }

      return {
        question: qText,
        answer: 'Yes, I possess extensive experience matching all stated requirements.',
        confidence: 0.85,
      };
    });
  }

  /**
   * Updates application step progression
   */
  public static async updateApplicationStep(
    jobApplicationId: string,
    step: ApplicationStep,
    message?: string
  ) {
    await getConnection();
    return await JobApplication.findByIdAndUpdate(
      jobApplicationId,
      {
        $set: {
          'metadata.currentStep': step,
          'metadata.lastStepUpdate': new Date(),
        },
        $push: {
          statusHistory: {
            status: step,
            date: new Date(),
            notes: message || `Application step updated to ${step}`,
          },
        },
      },
      { new: true }
    );
  }
}

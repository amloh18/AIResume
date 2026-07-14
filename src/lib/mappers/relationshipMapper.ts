import { JobJourneySnapshot, DocumentSnapshot, DocumentStatus, RelationshipHealth } from '@/types/job-relationship';
import { serializeId } from '../utils/idSerializer';

export class RelationshipMapper {
  static mapToSnapshot(
    journey: any | null,
    cvDoc: any | null,
    clDoc: any | null
  ): JobJourneySnapshot {
    if (!journey) {
      return {
        journey: null,
        documents: {},
        health: 'missing_journey'
      };
    }

    const documents: JobJourneySnapshot['documents'] = {};
    let health: RelationshipHealth = 'healthy';

    // Map CV
    if (journey.cvId) {
      const cvIdStr = serializeId(journey.cvId)!;
      let status: DocumentStatus = 'ready';
      
      if (!cvDoc) {
        status = 'deleted';
        health = 'missing_cv';
      } else if (journey.status === 'processing_documents') {
        status = 'generating';
      } else if (journey.status === 'creation_failed') {
        status = 'failed';
      }

      documents.cv = {
        id: cvIdStr,
        status,
        atsScore: cvDoc?.atsScore,
        updatedAt: cvDoc?.updatedAt?.toISOString() || journey.metadata?.updatedAt?.toISOString() || new Date().toISOString()
      };
    }

    // Map Cover Letter
    if (journey.coverLetterId) {
      const clIdStr = serializeId(journey.coverLetterId)!;
      let status: DocumentStatus = 'ready';

      if (!clDoc) {
        status = 'deleted';
        health = health === 'healthy' ? 'missing_cover_letter' : 'broken';
      } else if (journey.status === 'processing_documents') {
        status = 'generating';
      } else if (journey.status === 'creation_failed') {
        status = 'failed';
      }

      documents.coverLetter = {
        id: clIdStr,
        status,
        updatedAt: clDoc?.updatedAt?.toISOString() || journey.metadata?.updatedAt?.toISOString() || new Date().toISOString()
      };
    }

    return {
      journey: {
        id: serializeId(journey._id)!,
        status: journey.status,
        currentStep: journey.currentStep || 1
      },
      documents,
      health
    };
  }
}

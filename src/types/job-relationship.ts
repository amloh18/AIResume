export type JourneyStatus = 'in-progress' | 'completed' | 'paused' | 'processing_documents' | 'creation_failed' | 'ready' | 'draft';
export type DocumentStatus = 'ready' | 'generating' | 'failed' | 'deleted' | 'outdated';
export type RelationshipHealth = 'healthy' | 'missing_journey' | 'missing_cv' | 'missing_cover_letter' | 'orphaned' | 'broken';

export interface DocumentSnapshot {
  id: string;
  status: DocumentStatus;
  atsScore?: number;
  updatedAt: string;
}

export interface JobJourneySnapshot {
  journey: {
    id: string;
    status: JourneyStatus;
    currentStep: number;
  } | null;
  documents: {
    cv?: DocumentSnapshot;
    coverLetter?: DocumentSnapshot;
    [key: string]: DocumentSnapshot | undefined;
  };
  health: RelationshipHealth;
}

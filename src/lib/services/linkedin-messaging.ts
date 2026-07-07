export interface LinkedInMessage {
  id: string;
  jobId?: string;
  direction: 'inbound' | 'outbound';
  senderName: string;
  senderProfileUrl?: string;
  recipientName: string;
  recipientProfileUrl?: string;
  subject?: string;
  bodyText: string;
  sentAt: Date;
  isRead: boolean;
  conversationId: string;
  providerMessageId?: string;
}

export interface LinkedInConversation {
  id: string;
  participantNames: string[];
  participantProfileUrls: string[];
  lastMessageAt: Date;
  lastMessageSnippet: string;
  unreadCount: number;
  messages: LinkedInMessage[];
}

export async function sendLinkedInMessage(params: {
  recipientProfileUrl: string;
  bodyText: string;
  subject?: string;
}): Promise<{ success: boolean; message?: LinkedInMessage; error?: string }> {
  return {
    success: false,
    error: 'LinkedIn messaging is not yet connected. Please use the LinkedIn Enhancer extension.'
  };
}

export async function fetchLinkedInConversations(): Promise<{ success: boolean; conversations?: LinkedInConversation[]; error?: string }> {
  return {
    success: false,
    error: 'LinkedIn messaging is not yet connected. Please use the LinkedIn Enhancer extension.'
  };
}

export async function syncLinkedInToTracker(params: {
  jobId: string;
  conversationId: string;
}): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: 'LinkedIn sync is not yet implemented.'
  };
}

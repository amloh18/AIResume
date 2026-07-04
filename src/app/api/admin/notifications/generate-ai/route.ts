import { NextRequest, NextResponse } from 'next/server';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { withAdminAuth } from '@/lib/middleware/admin-auth';

const NOTIFICATION_GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A catchy, professional, or action-oriented title/subject for the notification. Must be brief.'
    },
    message: {
      type: 'string',
      description: 'The body/content of the notification explaining the update, promotion, or alert details clearly and concisely (max 3 sentences).'
    },
    type: {
      type: 'string',
      enum: ['system_update', 'discount_offer', 'achievement', 'job_applied'],
      description: 'The most appropriate category/type code.'
    },
    icon: {
      type: 'string',
      enum: ['Bell', 'Sparkles', 'DollarSign', 'Megaphone', 'Clock', 'Gift', 'AlertTriangle', 'TrendingUp', 'CheckCircle', 'Beaker', 'Plus', 'Info'],
      description: 'The most appropriate Lucide icon name matching the alert context.'
    }
  },
  required: ['title', 'message', 'type', 'icon']
};

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { notificationType, topic, targetAudience = 'all' } = await request.json();

    if (!topic) {
      return NextResponse.json({ success: false, error: 'Topic or context is required' }, { status: 400 });
    }

    const systemPrompt = `You are a professional system communication generator for CV Circle (a premium CV builder & ATS optimization tool).
Generate a notification payload containing a title, body message, category type, and suitable Lucide icon name.
Make sure the tone aligns perfectly with the topic (urgent for system outages/maintenance, celebratory for achievements, persuasive and highly exciting for promotions/discounts).`;

    const prompt = `Generate a notification for:
Category hint: ${notificationType || 'any'}
Topic/Context details: ${topic}
Target Audience: ${targetAudience}

Output valid JSON matching the requested schema. Ensure titles and messages are direct, impactful, and fit within compact standard notification blocks. Do not mention placeholder text.`;

    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt,
      responseSchema: NOTIFICATION_GENERATION_SCHEMA,
      responseMimeType: 'application/json',
      action: 'admin_generate_notification'
    });

    const parsed = JSON.parse(aiResponse.content);
    
    return NextResponse.json({
      success: true,
      data: {
        title: parsed.title,
        message: parsed.message,
        type: parsed.type,
        icon: parsed.icon
      }
    });

  } catch (error: any) {
    console.error('❌ AI notification generation error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate notification with AI' }, { status: 500 });
  }
}) as (request: NextRequest) => Promise<NextResponse>;

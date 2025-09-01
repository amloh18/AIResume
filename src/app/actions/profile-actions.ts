'use server';

import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';

/**
 * Server Action to send messages from the contact form
 * This function handles form submissions without client-side fetch
 */
export async function sendProfileMessage(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const recipientId = formData.get('recipientId') as string;
    
    // Validate required fields
    if (!name || !email || !subject || !message || !recipientId) {
      return {
        success: false,
        message: 'All fields are required'
      };
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Please enter a valid email address'
      };
    }
    
    // Here you would typically:
    // 1. Save the message to a database
    // 2. Send email notification to the profile owner
    // 3. Send confirmation email to the sender
    
    // For now, we'll just log the message (replace with actual implementation)
    console.log('Profile message received:', {
      from: { name, email },
      to: recipientId,
      subject,
      message
    });
    
    return {
      success: true,
      message: 'Message sent successfully!'
    };
  } catch (error) {
    console.error('Error sending profile message:', error);
    return {
      success: false,
      message: 'Failed to send message. Please try again.'
    };
  }
}

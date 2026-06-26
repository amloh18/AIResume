import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { EmailAccount } from '@/models/TrackerEmail';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const account = await EmailAccount.findOne({ userId });

    return NextResponse.json({
      success: true,
      connected: account ? account.syncStatus === 'connected' : false,
      emailAddress: account ? account.emailAddress : '',
      provider: account ? account.provider : 'gmail',
      syncStatus: account ? account.syncStatus : 'disconnected'
    });
  } catch (error: any) {
    console.error('Fetch sync status error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { 
      action, 
      provider = 'gmail', 
      emailAddress = 'user@gmail.com',
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      password 
    } = body;

    let account = await EmailAccount.findOne({ userId });

    if (action === 'connect') {
      if (provider === 'imap') {
        if (!imapHost || !smtpHost || !password) {
          return NextResponse.json({ success: false, error: 'IMAP host, SMTP host, and password are required' }, { status: 400 });
        }
        
        try {
          const nodemailer = await import('nodemailer');
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort) || 465,
            secure: Number(smtpPort) === 465,
            auth: {
              user: emailAddress,
              pass: password,
            },
            connectionTimeout: 8000
          });
          
          await transporter.verify();
        } catch (smtpErr: any) {
          console.error('SMTP connection check failed:', smtpErr);
          return NextResponse.json({
            success: false,
            error: `Outgoing SMTP server connection failed: ${smtpErr.message || 'Check credentials.'}`
          }, { status: 400 });
        }
      }

      if (!account) {
        account = await EmailAccount.create({
          userId,
          provider,
          emailAddress,
          syncStatus: 'connected',
          lastSyncedAt: new Date(),
          imapHost,
          imapPort,
          smtpHost,
          smtpPort,
          password
        });
      } else {
        account.syncStatus = 'connected';
        account.emailAddress = emailAddress;
        account.provider = provider;
        account.lastSyncedAt = new Date();
        if (provider === 'imap') {
          account.imapHost = imapHost;
          account.imapPort = imapPort;
          account.smtpHost = smtpHost;
          account.smtpPort = smtpPort;
          account.password = password;
        } else {
          // Clear IMAP settings if switching to OAuth Gmail/Outlook
          account.imapHost = undefined;
          account.imapPort = undefined;
          account.smtpHost = undefined;
          account.smtpPort = undefined;
          account.password = undefined;
        }
        await account.save();
      }
    } else if (action === 'disconnect') {
      if (account) {
        account.syncStatus = 'disconnected';
        await account.save();
      }
    }

    return NextResponse.json({
      success: true,
      connected: account ? account.syncStatus === 'connected' : false,
      emailAddress: account ? account.emailAddress : '',
      provider: account ? account.provider : 'gmail',
      syncStatus: account ? account.syncStatus : 'disconnected'
    });
  } catch (error: any) {
    console.error('Post sync status error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

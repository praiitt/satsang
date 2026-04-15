import sgMail from '@sendgrid/mail';
import { db } from './firebase-admin';
import admin from 'firebase-admin';

const API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@rraasi.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'RRAASI Spiritual Platform';

if (API_KEY) {
  sgMail.setApiKey(API_KEY);
  console.log('[EmailClient] ✅ SendGrid initialized');
} else {
  console.warn('[EmailClient] ⚠️ SENDGRID_API_KEY not set. Emails will not be sent.');
}

export interface SendLog {
  to: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
  timestamp: string;
}

const _sendLogs: SendLog[] = [];

export function getSendLogs() {
  return _sendLogs;
}

export function isConfigured() {
  return !!API_KEY && !!FROM_EMAIL;
}

export function getConfig() {
  return {
    configured: isConfigured(),
    from: FROM_EMAIL,
    fromName: FROM_NAME,
    apiKeySet: !!API_KEY,
  };
}

async function persistLog(log: SendLog) {
  try {
    await db.collection('email_logs').add({
      ...log,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[EmailClient] Failed to persist log:', err);
  }
}

function wrapEmailTemplate(html: string, to: string): string {
  const unsubUrl = `https://www.rraasi.com/unsubscribe?email=${encodeURIComponent(to)}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:#1a1208;padding:20px 32px;text-align:center;"><p style="margin:0;color:#ff9f4d;font-size:20px;font-weight:bold;">🙏 RRAASI</p><p style="margin:4px 0 0;color:#d8c2a7;font-size:11px;">Spiritual Platform</p></td></tr>
<tr><td style="padding:32px;color:#333;font-size:15px;line-height:1.7;">${html}</td></tr>
<tr><td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;text-align:center;">
<p style="margin:0;color:#999;font-size:11px;">You received this email because you are registered at RRAASI.<br>
<a href="${unsubUrl}" style="color:#cc6600;">Unsubscribe</a> &nbsp;|&nbsp; <a href="https://www.rraasi.com" style="color:#cc6600;">www.rraasi.com</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  if (!isConfigured()) throw new Error('SendGrid API key not configured');

  const unsubUrl = `https://www.rraasi.com/unsubscribe?email=${encodeURIComponent(to)}`;
  const msg: any = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    html: wrapEmailTemplate(html, to),
    text: (text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()) + `\n\nUnsubscribe: ${unsubUrl}`,
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`[EmailClient] ✅ Email sent to ${to}`);
    const log: SendLog = { to, subject, status: 'sent', timestamp: new Date().toISOString() };
    _sendLogs.unshift(log);
    if (_sendLogs.length > 500) _sendLogs.length = 500;
    await persistLog(log);
  } catch (err: any) {
    const errorMsg = err?.response?.body?.errors?.[0]?.message || err.message || 'Unknown error';
    console.error(`[EmailClient] ❌ Failed to send to ${to}:`, errorMsg);
    const log: SendLog = { to, subject, status: 'failed', error: errorMsg, timestamp: new Date().toISOString() };
    _sendLogs.unshift(log);
    if (_sendLogs.length > 500) _sendLogs.length = 500;
    await persistLog(log);
    throw new Error(errorMsg);
  }
}

export async function sendBroadcast(
  emails: string[],
  subject: string,
  html: string,
  text?: string,
  delayMs = 500
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  console.log(`[EmailClient] Starting broadcast to ${emails.length} recipients`);

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    try {
      await sendEmail(email, subject, html, text);
      sent++;
    } catch {
      failed++;
    }
    if (i < emails.length - 1) {
      await new Promise(res => setTimeout(res, delayMs));
    }
  }

  console.log(`[EmailClient] ✅ Broadcast complete — Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed };
}

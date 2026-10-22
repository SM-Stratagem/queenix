/**
 * Outbound email + SMS for auth codes (and anything else that needs them).
 *
 * Email: SMTP via nodemailer — every mainstream provider (Resend, AWS SES,
 * SendGrid, Postmark, Mailgun, Zoho, Microsoft 365) exposes SMTP, so
 * switching provider = changing SMTP_URL. Locally SMTP_URL points at Mailpit
 * (docker compose), whose inbox UI is http://localhost:8025.
 *
 * SMS: SMS_PROVIDER=twilio (production default) uses Twilio's REST API.
 * SMS_PROVIDER=dev-inbox (development default) delivers the text as an email
 * to Mailpit, so one local inbox shows every code the system sends.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { isProductionRuntime, setting } from './env';

let transport: Transporter | null = null;
function mailer(): Transporter {
  transport ??= nodemailer.createTransport(setting('SMTP_URL', 'smtp://localhost:1025'));
  return transport;
}

const from = () => setting('EMAIL_FROM', 'Queenix Gym <no-reply@queenix.local>');

export async function sendEmail(msg: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  await mailer().sendMail({ from: from(), ...msg });
}

export async function sendSms(msg: { to: string; body: string }): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? (isProductionRuntime() ? 'twilio' : 'dev-inbox');
  if (provider === 'dev-inbox') {
    // Local prod-mode testing (docker-compose.prod.yml) opts in explicitly; real deployments never set it.
    if (isProductionRuntime() && process.env.ALLOW_DEV_SMS_INBOX !== '1') {
      throw new Error('SMS_PROVIDER=dev-inbox is not allowed in production');
    }
    await sendEmail({ to: `sms+${msg.to.replace(/[^\d]/g, '')}@sms.queenix.local`, subject: `SMS to ${msg.to}`, text: msg.body });
    return;
  }
  if (provider !== 'twilio') throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
  const sid = setting('TWILIO_ACCOUNT_SID', '');
  const token = setting('TWILIO_AUTH_TOKEN', '');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: msg.to, From: setting('TWILIO_FROM', ''), Body: msg.body }),
  });
  if (!res.ok) throw new Error(`Twilio SMS failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

const PURPOSE: Record<string, string> = {
  'sign-in': 'sign in',
  'email-verification': 'verify your email',
  'forget-password': 'reset your password',
  'change-email': 'confirm your new email',
  'phone-verification': 'verify your phone',
  'phone-password-reset': 'reset your password',
};

/** One code-message format for every channel/purpose. */
export function codeMessage(code: string, purpose: string): { subject: string; text: string; html: string } {
  const why = PURPOSE[purpose] ?? 'continue';
  const text = `Your Queenix Gym code to ${why} is ${code}. It expires in 10 minutes. If you didn't ask for it, ignore this message.`;
  return {
    subject: `${code} is your Queenix Gym code`,
    text,
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px"><p>Your Queenix Gym code to ${why}:</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p><p style="color:#666">It expires in 10 minutes. If you didn't ask for it, ignore this email.</p></div>`,
  };
}

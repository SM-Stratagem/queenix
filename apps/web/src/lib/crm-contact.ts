/**
 * CRM contact deep links: WhatsApp (wa.me with prefilled text) and email
 * (mailto with subject + body), with per-stage message templates.
 * Pure functions — safe to unit-test and reuse on any surface.
 */

export function normalizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '');
}

const STAGE_TEMPLATES: Record<string, (name: string) => string> = {
  new: (name) => `Hi ${name}! This is Queenix Gym (women-only fitness, Dubai). Thanks for your interest — would you like a free tour this week?`,
  contacted: (name) => `Hi ${name}, following up from Queenix Gym. Any questions I can answer about memberships or classes?`,
  trial: (name) => `Hi ${name}! How was your trial session at Queenix? I'd love to help you pick the right plan to keep going.`,
  converted: (name) => `Welcome to Queenix, ${name}! Your membership is active — see you at your first class. Let me know if you need anything.`,
  lost: (name) => `Hi ${name}, we miss you at Queenix! There's a win-back offer this month if you'd like to return — shall I share details?`,
};

export function stageMessage(stage: string, leadName: string): string {
  const name = leadName.trim() || 'there';
  const template = STAGE_TEMPLATES[stage] ?? STAGE_TEMPLATES.new!;
  return template(name);
}

/** https://wa.me/<digits>?text=… — returns null when no usable phone. */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const digits = normalizePhoneForWhatsApp(phone ?? '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

const STAGE_SUBJECTS: Record<string, string> = {
  new: 'Welcome to Queenix Gym',
  contacted: 'Following up — Queenix Gym',
  trial: 'How was your trial?',
  converted: 'Your Queenix membership is active',
  lost: 'We miss you at Queenix',
};

/** mailto: with subject + body — returns null when no email. */
export function buildMailtoUrl(
  email: string | null | undefined,
  stage: string,
  message: string
): string | null {
  const addr = (email ?? '').trim();
  if (!addr) return null;
  const subject = STAGE_SUBJECTS[stage] ?? STAGE_SUBJECTS.new!;
  return `mailto:${addr}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

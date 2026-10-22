/** Display formatting for the public site. The club runs on Dubai time. */
export const TZ = 'Asia/Dubai';

const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const day = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const short = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const date = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
const key = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export const fmtTime = (ms: number) => time.format(ms);
export const fmtDay = (ms: number) => day.format(ms);
export const fmtShortDay = (ms: number) => short.format(ms);
export const fmtDate = (ms: number) => date.format(ms);
export const dayKey = (ms: number) => key.format(ms);

export function fmtPrice(cents: number, currency: string) {
  const n = cents / 100;
  return `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: n % 1 ? 2 : 0 })}`;
}

export function fmtPeriod(days: number) {
  if (days === 30 || days === 31) return 'month';
  if (days === 365) return 'year';
  if (days % 30 === 0) return `${days / 30} months`;
  return `${days} days`;
}

/** 'Today' / 'Tomorrow' / 'Fri 24 Oct' relative to now, in club time. */
export function relDay(ms: number, now: number) {
  const k = dayKey(ms);
  if (k === dayKey(now)) return 'Today';
  if (k === dayKey(now + 86_400_000)) return 'Tomorrow';
  return fmtShortDay(ms);
}

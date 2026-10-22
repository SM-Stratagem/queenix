export { card, btnPrimary, btnGhost, inputStyle } from '../admin/styles';

export const ALL_ROLES = [
  'superadmin',
  'admin',
  'finance',
  'operations',
  'salon',
  'coffee',
  'trainer',
  'member',
] as const;


export function fmtDay(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

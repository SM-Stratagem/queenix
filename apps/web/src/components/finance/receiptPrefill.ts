/** OCR receipt fields → journal form values (kind is always expense). */
const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/dewa|electric|water|etisalat|\bdu\b|internet|telecom|utilit/i, 'Utilities'],
  [/rent|real estate|propert|leasing/i, 'Rent'],
  [/repair|maintenance|plumb|clean|technical service/i, 'Maintenance'],
  [/advert|marketing|print|media|social/i, 'Marketing'],
  [/salary|payroll|wps/i, 'Payroll'],
  [/suppl|fitness|sport|equipment|store|mart|trading|pharma/i, 'Supplies'],
];

export function receiptPrefill(fields: Record<string, any>) {
  const vendor = typeof fields.vendor === 'string' ? fields.vendor : '';
  const hay = `${vendor} ${Array.isArray(fields.items) ? fields.items.join(' ') : ''}`;
  return {
    amount: typeof fields.total === 'number' ? fields.total.toFixed(2) : '',
    date: typeof fields.date === 'string' ? fields.date : '',
    note: [vendor, fields.trn ? `TRN ${fields.trn}` : ''].filter(Boolean).join(' · '),
    category: CATEGORY_HINTS.find(([re]) => re.test(hay))?.[1] ?? 'Other expense',
    currency: typeof fields.currency === 'string' ? fields.currency : 'AED',
  };
}

/**
 * Client-side CSV import helper (no dependencies).
 * `parseCsv(text)` parses RFC-4180 rows (quoted cells, escaped quotes,
 * embedded newlines) into a header map + record objects keyed by header.
 */

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsv(text: string): ParsedCsv {
  const normalized = text.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i] ?? '';
    if (inQuotes) {
      if (ch === '"') {
        if ((normalized[i + 1] ?? '') === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      records.push(row);
      row = [];
    } else if (ch === '\r') {
      // Ignore; \n terminates the record.
    } else {
      field += ch;
    }
  }
  row.push(field);
  records.push(row);
  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ''));
  const first = nonEmpty[0];
  if (!first) return { headers: [], rows: [] };
  const headers = first.map((h) => h.trim());
  return {
    headers,
    rows: nonEmpty.slice(1).map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? '').trim();
      });
      return obj;
    }),
  };
}

export type JournalDraft = {
  line: number;
  kind: 'income' | 'expense';
  category: string;
  amountCents: number;
  entryDate: number;
  note?: string;
  error?: string;
};

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['date', 'entrydate', 'entry_date', 'day'],
  kind: ['kind', 'type'],
  category: ['category', 'account', 'name'],
  amount: ['amountaed', 'amount', 'aed', 'total', 'value'],
  note: ['note', 'notes', 'description', 'memo'],
};

function pick(row: Record<string, string>, keys: string[] | undefined): string {
  if (!keys) return '';
  const lowered: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) lowered[k.toLowerCase()] = v;
  for (const key of keys) {
    if (lowered[key] !== undefined && lowered[key] !== '') return lowered[key];
  }
  return '';
}

/** Map parsed CSV rows onto journal-entry drafts, flagging bad lines. */
export function toJournalDrafts(parsed: ParsedCsv): JournalDraft[] {
  return parsed.rows.map((row, idx) => {
    const line = idx + 2; // 1-based incl. header
    const kindRaw = pick(row, HEADER_ALIASES.kind).toLowerCase();
    const kind = kindRaw.startsWith('inc') ? 'income' : kindRaw.startsWith('exp') ? 'expense' : null;
    const category = pick(row, HEADER_ALIASES.category);
    const amountRaw = pick(row, HEADER_ALIASES.amount).replace(/[, ]/g, '');
    const cents = Math.round(Number(amountRaw) * 100);
    const dateRaw = pick(row, HEADER_ALIASES.date);
    const note = pick(row, HEADER_ALIASES.note) || undefined;
    let entryDate = Date.parse(`${dateRaw}T12:00:00`);
    if (!dateRaw || !Number.isFinite(entryDate)) entryDate = Date.now();
    let error: string | undefined;
    if (!kind) error = `Line ${line}: kind must be income or expense.`;
    else if (!category) error = `Line ${line}: category is required.`;
    else if (!Number.isFinite(cents) || cents <= 0) error = `Line ${line}: amount must be a positive number.`;
    return {
      line,
      kind: kind ?? 'expense',
      category,
      amountCents: Number.isFinite(cents) ? cents : 0,
      entryDate,
      note,
      error,
    };
  });
}

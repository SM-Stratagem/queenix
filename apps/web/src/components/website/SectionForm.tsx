'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@queenix/convex';
import { Plus, Trash2 } from 'lucide-react';
import { btnGhost, btnPrimary, card, inputStyle } from '@/components/admin/styles';
import { errMsg } from '@/lib/errors';
import { MediaPicker } from './MediaPicker';
import { Notice, label } from './WebsiteHeader';
import { SITE_DEFAULTS, type SiteKey } from '@queenix/convex/site';

type Obj = Record<string, unknown>;

export const SECTION_INFO: Record<string, { title: string; hint: string }> = {
  hero: { title: 'Hero', hint: 'The first screen of the home page.' },
  about: { title: 'About', hint: 'Why Queenix — heading, intro and highlight cards.' },
  testimonials: { title: 'Testimonials', hint: 'Member quotes on the home page.' },
  contact: { title: 'Contact & hours', hint: 'Address, phone, map and opening hours (footer + contact page).' },
  social: { title: 'Social links', hint: 'Footer social profile URLs.' },
  appPromo: { title: 'App promo', hint: 'Download-the-app band and store links.' },
  seo: { title: 'SEO', hint: 'Default page title and search description.' },
};

const WORDS: Record<string, string> = { cta: 'CTA', url: 'URL', ios: 'iOS', seo: 'SEO', whatsapp: 'WhatsApp', tiktok: 'TikTok' };
const LABELS: Record<string, string> = { iosUrl: 'iOS app URL', androidUrl: 'Android app URL' };
const humanize = (k: string) => {
  if (LABELS[k]) return LABELS[k];
  const words = k.replace(/([A-Z])/g, ' $1').toLowerCase().split(' ');
  const s = words.map((w) => WORDS[w] ?? w).join(' ');
  // A mapped first word keeps its own casing ('iOS', not 'IOS').
  return words[0] && WORDS[words[0]] ? s : s.charAt(0).toUpperCase() + s.slice(1);
};
const LONG = new Set(['body', 'subheadline', 'description', 'quote']);
const SINGULAR: Record<string, string> = { highlights: 'highlight', items: 'testimonial', hours: 'hours row' };

function blank(def: unknown): unknown {
  if (typeof def === 'string') return '';
  if (Array.isArray(def)) return [];
  return Object.fromEntries(Object.entries(def as Obj).map(([k, d]) => [k, blank(d)]));
}

/** One editor field, shaped by the section default (string / list / object). */
function Field({ name, def, value, onChange }: { name: string; def: unknown; value: unknown; onChange: (v: unknown) => void }) {
  if (typeof def === 'string') {
    const v = typeof value === 'string' ? value : '';
    const common = { value: v, maxLength: 2000, style: inputStyle, onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
    return (
      <label style={label}>
        {humanize(name)}
        {LONG.has(name) ? <textarea rows={3} {...common} style={{ ...inputStyle, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }} /> : <input {...common} />}
      </label>
    );
  }
  if (Array.isArray(def)) {
    const list = Array.isArray(value) ? (value as unknown[]) : [];
    const one = SINGULAR[name] ?? 'item';
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={{ ...label, display: 'block' }}>{humanize(name)} ({list.length})</span>
        {list.map((item, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'grid', gap: 8, background: 'var(--bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                {humanize(one)} {i + 1}
              </span>
              <button
                type="button"
                aria-label={`Remove ${one} ${i + 1}`}
                onClick={() => onChange(list.filter((_, j) => j !== i))}
                style={{ ...btnGhost, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--danger)' }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <Field name="" def={def[0]} value={item} onChange={(nv) => onChange(list.map((x, j) => (j === i ? nv : x)))} />
          </div>
        ))}
        <button
          type="button"
          disabled={list.length >= 20}
          onClick={() => onChange([...list, blank(def[0])])}
          style={{ ...btnGhost, justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> Add {one}
        </button>
      </div>
    );
  }
  const d = def as Obj;
  const o = (value && typeof value === 'object' ? value : {}) as Obj;
  const grid = (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' }}>
      {Object.keys(d).map((k) => (
        <div key={k} style={{ gridColumn: typeof d[k] === 'string' && !LONG.has(k) ? undefined : '1 / -1' }}>
          <Field name={k} def={d[k]} value={o[k]} onChange={(nv) => onChange({ ...o, [k]: nv })} />
        </div>
      ))}
    </div>
  );
  if (!name) return grid;
  return (
    <fieldset style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, margin: 0 }}>
      <legend style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', padding: '0 4px' }}>{humanize(name)}</legend>
      {grid}
    </fieldset>
  );
}

/** One card per website section: edit merged values, save that section only. */
export function SectionForm({ sectionKey, data, updatedAt }: { sectionKey: SiteKey; data: Obj; updatedAt: number | null }) {
  // Field order + list item shape come from the contract (Convex returns object keys sorted).
  const defaults = SITE_DEFAULTS[sectionKey] as Obj;
  const save = useMutation(api.mutations.site.saveSection);
  const [draft, setDraft] = useState<Obj>(data);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data);
  const info = SECTION_INFO[sectionKey] ?? { title: humanize(sectionKey), hint: '' };

  async function onSave() {
    setBusy(true);
    setOk(null);
    setErr(null);
    try {
      await save({ key: sectionKey, data: draft });
      setOk(`${info.title} saved — live on the website.`);
    } catch (e) {
      setErr(errMsg(e, 'Could not save'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={info.title} style={{ ...card, display: 'grid', gap: 14, padding: 20 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 17 }}>{info.title}</h2>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          {info.hint} {updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}.` : 'Showing default copy.'}
        </p>
      </div>
      {sectionKey === 'hero' && (
        <MediaPicker
          label="Hero image"
          album="hero"
          noneLabel="Auto"
          value={typeof draft.mediaId === 'string' ? draft.mediaId : ''}
          onChange={(id) => setDraft((d) => ({ ...d, mediaId: id || undefined }))}
        />
      )}
      <Field name="" def={defaults} value={draft} onChange={(v) => setDraft(v as Obj)} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={onSave} disabled={busy || !dirty} style={{ ...btnPrimary, opacity: busy || !dirty ? 0.5 : 1 }}>
          {busy ? 'Saving…' : `Save ${info.title === info.title.toUpperCase() ? info.title : info.title.toLowerCase()}`}
        </button>
        {dirty && (
          <button type="button" onClick={() => { setDraft(data); setErr(null); }} style={btnGhost}>
            Discard changes
          </button>
        )}
        <Notice ok={dirty ? null : ok} err={err} />
      </div>
    </section>
  );
}

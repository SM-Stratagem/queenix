'use client';
/**
 * Website CMS — media library: upload (Convex storage), alt/caption/album,
 * reorder within an album, publish toggle, delete (removes the stored file).
 */
import { useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Upload } from 'lucide-react';
import { QueryBoundary, Skeleton, EmptyState } from '@/components/admin/QueryBoundary';
import { btnPrimary, card, inputStyle } from '@/components/admin/styles';
import { errMsg } from '@/lib/errors';
import { MediaCard, ALBUMS, type Album } from '@/components/website/MediaCard';
import { Notice, WebsiteHeader, label } from '@/components/website/WebsiteHeader';

const MAX_BYTES = 8 * 1024 * 1024;

function UploadForm() {
  const generateUploadUrl = useMutation(api.mutations.site.generateUploadUrl);
  const createMedia = useMutation(api.mutations.site.createMedia);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [album, setAlbum] = useState<Album>('gallery');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function pick(f: File | null) {
    setOk(null);
    setErr(null);
    if (f && !f.type.startsWith('image/')) return setErr('Only image files can be uploaded.');
    if (f && f.size > MAX_BYTES) return setErr('That image is over 8 MB — please resize it first.');
    setFile(f);
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    setErr(null);
    if (!file) return setErr('Choose an image first.');
    if (!alt.trim()) return setErr('Alt text is required (describe the image for screen readers and SEO).');
    setBusy(true);
    try {
      const url = await generateUploadUrl({});
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      const out = await createMedia({ storageId, alt, caption: caption || undefined, album });
      if (!out.ok) return setErr(out.message);
      setOk('Uploaded — it stays hidden from the site until you publish it.');
      setFile(null);
      setAlt('');
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setErr(errMsg(e, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form aria-label="Upload image" onSubmit={onUpload} style={{ ...card, display: 'grid', gap: 12, padding: 20, marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 17 }}>Upload image</h2>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
        <label style={label}>
          Image file (max 8 MB)
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(e) => pick(e.target.files?.[0] ?? null)} style={inputStyle} />
        </label>
        <label style={label}>
          Alt text (required)
          <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} placeholder="e.g. Members in a reformer class" style={inputStyle} />
        </label>
        <label style={label}>
          Caption
          <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} style={inputStyle} />
        </label>
        <label style={label}>
          Album
          <select value={album} onChange={(e) => setAlbum(e.target.value as Album)} style={inputStyle}>
            {ALBUMS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="submit" disabled={busy} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: busy ? 0.6 : 1 }}>
          <Upload size={14} /> {busy ? 'Uploading…' : 'Upload'}
        </button>
        <Notice ok={ok} err={err} />
      </div>
    </form>
  );
}

function Library() {
  const [album, setAlbum] = useState<Album | ''>('');
  const media = useQuery(api.queries.siteAdmin.listMedia, album ? { album } : {});
  return (
    <section aria-label="Library">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ margin: '0 8px 0 0', fontSize: 17 }}>Library</h2>
        {(['', ...ALBUMS] as const).map((a) => (
          <button
            key={a || 'all'}
            type="button"
            aria-pressed={album === a}
            onClick={() => setAlbum(a)}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: album === a ? 'var(--brand)' : 'var(--bg-elevated)',
              color: album === a ? '#fff' : 'var(--text)',
              textTransform: 'capitalize',
            }}
          >
            {a || 'all'}
          </button>
        ))}
      </div>
      {media === undefined ? (
        <Skeleton height={220} />
      ) : media.length === 0 ? (
        <EmptyState message={album ? `No images in the ${album} album yet.` : 'No images yet — upload the first one above.'} />
      ) : (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))' }}>
          {media.map((m, i) => (
            <MediaCard
              key={m._id}
              m={m}
              first={media[i - 1]?.album !== m.album}
              last={media[i + 1]?.album !== m.album}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function WebsiteMediaPage() {
  return (
    <div>
      <WebsiteHeader title="Media library" subtitle="Photos for the gallery, hero and blog. Only published images appear on the public site." viewHref="/gallery" />
      <UploadForm />
      <QueryBoundary>
        <Library />
      </QueryBoundary>
    </div>
  );
}

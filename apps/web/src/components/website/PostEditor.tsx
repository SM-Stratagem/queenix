'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { Marked } from 'marked';
import { api } from '@queenix/convex';
import type { FunctionReturnType } from 'convex/server';
import { btnGhost, btnPrimary, card, inputStyle } from '@/components/admin/styles';
import { errMsg } from '@/lib/errors';
import { slugify } from '@queenix/convex/site';
import { MediaPicker } from './MediaPicker';
import { Notice, label } from './WebsiteHeader';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Raw HTML in the markdown is shown as text, never injected. */
type Post = NonNullable<FunctionReturnType<typeof api.queries.siteAdmin.getPost>>;

const md = new Marked({ renderer: { html: ({ text }) => escapeHtml(text) } });

export function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 999,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        background: status === 'published' ? 'rgba(16,185,129,0.15)' : 'var(--bg-muted)',
        color: status === 'published' ? 'var(--success)' : 'var(--text-muted)',
        border: '1px solid var(--border)',
      }}
    >
      {status}
    </span>
  );
}

/** Create/edit a blog post. No `post` = new draft (redirects to its page after first save). */
export function PostEditor({ post }: { post?: Post }) {
  const router = useRouter();
  const save = useMutation(api.mutations.site.savePost);
  const remove = useMutation(api.mutations.site.deletePost);
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [cover, setCover] = useState<string>(post?.coverMediaId ?? '');
  const [tags, setTags] = useState((post?.tags ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const preview = useMemo(() => md.parse(body || '*Nothing to preview yet.*', { async: false }), [body]);
  const status = post?.status ?? 'draft';
  const effectiveSlug = slugTouched ? slug : slugify(title);

  async function submit(next: 'draft' | 'published', done: string) {
    setBusy(true);
    setOk(null);
    setErr(null);
    try {
      const id = await save({
        id: post?._id,
        title,
        slug: effectiveSlug,
        excerpt,
        body,
        coverMediaId: (cover || null) as Post['coverMediaId'] | null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        status: next,
      });
      setSlug(effectiveSlug);
      setSlugTouched(true);
      setOk(done);
      if (!post) router.replace(`/website/blog/${id}`);
    } catch (e) {
      setErr(errMsg(e, 'Could not save the post'));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!post || !confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await remove({ id: post._id });
      router.push('/website/blog');
    } catch (e) {
      setErr(errMsg(e, 'Could not delete'));
    }
  }

  const btn = (style: React.CSSProperties) => ({ ...style, opacity: busy ? 0.6 : 1 });

  return (
    <form aria-label="Post editor" onSubmit={(e) => e.preventDefault()} style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...card, display: 'grid', gap: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Status</span>
          <StatusBadge status={status} />
          {post?.publishedAt && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>first published {new Date(post.publishedAt).toLocaleDateString()}</span>
          )}
        </div>
        <label style={label}>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} style={{ ...inputStyle, fontSize: 16, fontWeight: 600 }} />
        </label>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
          <label style={label}>
            Slug (URL: /blog/{effectiveSlug || '…'})
            <input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
              }}
              maxLength={80}
              style={inputStyle}
            />
          </label>
          <label style={label}>
            Tags (comma separated)
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="training, nutrition" style={inputStyle} />
          </label>
        </div>
        <label style={label}>
          Excerpt
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={500} rows={2} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
        </label>
        <MediaPicker label="Cover image" value={cover} onChange={setCover} />
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))' }}>
        <label style={{ ...label, ...card, gridTemplateRows: 'auto 1fr' }}>
          Body (Markdown)
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
            style={{ ...inputStyle, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, lineHeight: 1.55, resize: 'vertical', minHeight: 320 }}
          />
        </label>
        <section aria-label="Preview" style={{ ...card, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Preview</div>
          <div className="qx-md" style={{ fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: preview }} />
        </section>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {status === 'draft' ? (
          <>
            <button type="button" disabled={busy} onClick={() => submit('draft', 'Draft saved.')} style={btn(btnGhost)}>
              Save draft
            </button>
            <button type="button" disabled={busy} onClick={() => submit('published', 'Published — live on the blog.')} style={btn(btnPrimary)}>
              Publish
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => submit('published', 'Changes saved.')} style={btn(btnPrimary)}>
              Save changes
            </button>
            <button type="button" disabled={busy} onClick={() => submit('draft', 'Unpublished — back to draft.')} style={btn(btnGhost)}>
              Unpublish
            </button>
            <a href={`/blog/${post?.slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>
              View on site
            </a>
          </>
        )}
        {post && (
          <button type="button" onClick={onDelete} style={{ ...btnGhost, color: 'var(--danger)', marginLeft: 'auto' }}>
            Delete post
          </button>
        )}
        <div style={{ flexBasis: '100%' }}>
          <Notice ok={ok} err={err} />
        </div>
      </div>
      <style>{`.qx-md h1,.qx-md h2,.qx-md h3{margin:1em 0 .4em}.qx-md p{margin:0 0 .8em}.qx-md a{color:var(--brand)}.qx-md img{max-width:100%}.qx-md ul,.qx-md ol{padding-left:1.4em;margin:0 0 .8em}.qx-md code{background:var(--bg);padding:1px 4px;border-radius:4px}.qx-md pre{background:var(--bg);padding:10px;border-radius:8px;overflow:auto}.qx-md blockquote{border-left:3px solid var(--border);margin:0 0 .8em;padding-left:12px;color:var(--text-muted)}`}</style>
    </form>
  );
}

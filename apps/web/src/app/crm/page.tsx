'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';
import { downloadCsv } from '../../components/finance/CsvExport';
import { stageMessage, buildWhatsAppUrl, buildMailtoUrl } from '@/lib/crm-contact';


const STAGES = ['new', 'contacted', 'trial', 'converted', 'lost'] as const;

export default function CrmPage() {
  const pipeline = useQuery(api.queries.crm.listLeadsByStage, {});
  const tasks = useQuery(api.queries.crm.tasksDue, {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useQuery(
    api.queries.crm.getLead,
    selectedId ? { leadId: selectedId as any } : 'skip'
  );
  const createLead = useMutation(api.mutations.crm.createLead);
  const updateLead = useMutation(api.mutations.crm.updateLead);
  const moveLead = useMutation(api.mutations.crm.moveLead);
  const logInteraction = useMutation(api.mutations.crm.logInteraction);
  const completeTask = useMutation(api.mutations.crm.completeTask);
  const assignTask = useMutation(api.mutations.crm.assignTask);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [convertSearch, setConvertSearch] = useState('');
  const [converting, setConverting] = useState(false);
  const memberHits = useQuery(
    api.queries.users.getMembersDirectory,
    converting && convertSearch.trim() ? { search: convertSearch.trim(), limit: 8 } : 'skip'
  );
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const columns = pipeline?.columns ?? STAGES.map((stage) => ({ stage, count: 0, leads: [] as any[] }));

  return (
    <RequireAuth>
      <AdminShell>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h1>CRM</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 16px' }}>Leads pipeline · lead detail · follow-up tasks (staff only).</p>
          </div>
          {(pipeline?.total ?? 0) > 0 && (
            <button
              onClick={() =>
                downloadCsv(
                  'crm-leads',
                  (pipeline?.columns ?? []).flatMap((col: any) =>
                    (col.leads ?? []).map((l: any) => ({
                      name: l.name,
                      phone: l.phone ?? '',
                      email: l.email ?? '',
                      source: l.source ?? '',
                      stage: col.stage,
                    }))
                  )
                )
              }
              style={primaryBtn}
            >
              Export CSV
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lead name" style={input} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={input} />
          <button
            onClick={async () => {
              setMsg(null);
              try {
                await createLead({ name, phone });
                setName(''); setPhone('');
                setMsg('Lead created.');
              } catch (e: any) { setMsg(e?.message ?? 'Failed to create lead.'); }
            }}
            style={primaryBtn}
          >
            Add lead
          </button>
          {msg && <span style={{ fontSize: 13, alignSelf: 'center' }}>{msg}</span>}
        </div>

        {!pipeline ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading pipeline…</p>
        ) : (
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            {columns.map((col: any) => (
              <div key={col.stage} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, background: 'var(--bg-elevated)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize', marginBottom: 8 }}>{col.stage} ({col.count})</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {col.leads.map((l: any) => (
                    <div key={l._id} onClick={() => { setSelectedId(l._id); setEditing(false); setConverting(false); setConvertSearch(''); }} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', background: selectedId === l._id ? 'var(--brand-light)' : 'var(--bg)', fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{l.name}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{l.phone}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {STAGES.filter((s) => s !== l.stage).map((s) => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); moveLead({ leadId: l._id, stage: s }); }} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text)', cursor: 'pointer' }}>→ {s}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {col.leads.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Empty</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginTop: 20 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-elevated)' }}>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Lead detail</h2>
            {!selectedId ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a lead to see history.</p>
            ) : !selected ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>
            ) : !selected.lead ? (
              <p style={{ fontSize: 13 }}>Lead not found.</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 700, flex: 1 }}>{selected.lead.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 13 }}>· {selected.lead.stage}</span></div>
                  {!editing && (
                    <button
                      onClick={() => {
                        setEditName(selected.lead.name ?? '');
                        setEditPhone(selected.lead.phone ?? '');
                        setEditEmail(selected.lead.email ?? '');
                        setEditSource(selected.lead.source ?? '');
                        setEditNotes(selected.lead.notes ?? '');
                        setEditing(true);
                      }}
                      style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editing ? (
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" style={input} />
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" style={input} />
                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" style={input} />
                    <input value={editSource} onChange={(e) => setEditSource(e.target.value)} placeholder="Source" style={input} />
                    <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" style={input} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={async () => {
                          setMsg(null);
                          try {
                            await updateLead({
                              leadId: selectedId as any,
                              name: editName.trim() || undefined,
                              phone: editPhone.trim() || undefined,
                              email: editEmail.trim() || undefined,
                              source: editSource.trim() || undefined,
                              notes: editNotes.trim() || undefined,
                            });
                            setEditing(false);
                            setMsg('Lead updated.');
                          } catch (e: any) { setMsg(e?.message ?? 'Failed to update lead.'); }
                        }}
                        style={primaryBtn}
                      >
                        Save
                      </button>
                      <button onClick={() => setEditing(false)} style={{ ...primaryBtn, background: 'var(--bg-muted)', color: 'var(--text)' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.lead.phone}{selected.lead.email ? ` · ${selected.lead.email}` : ''} · via {selected.lead.source}{selected.lead.notes ? ` · ${selected.lead.notes}` : ''}</div>
                )}
                <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 8, display: 'grid', gap: 4 }}>
                  {selected.interactions.map((i: any) => (
                    <li key={i._id}>[{i.channel}] {i.summary} <span style={{ color: 'var(--text-muted)' }}>· {new Date(i.createdAt).toLocaleString()}</span></li>
                  ))}
                  {selected.interactions.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No interactions yet.</li>}
                </ul>
                <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Conversion</div>
                  {selected.linkedUser ? (
                    <div style={{ fontSize: 13 }}>
                      Linked member:{' '}
                      <a href={`/members/${selected.linkedUser._id}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>
                        {selected.linkedUser.fullName ?? selected.linkedUser.email}
                      </a>
                    </div>
                  ) : converting ? (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <input value={convertSearch} onChange={(e) => setConvertSearch(e.target.value)} placeholder="Search members by name or email…" style={input} />
                      {(memberHits ?? []).map((m: any) => (
                        <div key={m.user._id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <span style={{ flex: 1 }}>{m.user.fullName} <span style={{ color: 'var(--text-muted)' }}>· {m.user.email}</span></span>
                          <button
                            onClick={async () => {
                              setMsg(null);
                              try {
                                await updateLead({ leadId: selectedId as any, convertedUserId: m.user._id });
                                await moveLead({ leadId: selectedId as any, stage: 'converted' });
                                setConverting(false);
                                setConvertSearch('');
                                setMsg('Lead converted and linked to member.');
                              } catch (e: any) { setMsg(e?.message ?? 'Conversion failed.'); }
                            }}
                            style={{ ...primaryBtn, padding: '4px 12px', fontSize: 12 }}
                          >
                            Link
                          </button>
                        </div>
                      ))}
                      {convertSearch.trim() && memberHits !== undefined && memberHits.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No members match — check the spelling.</div>
                      )}
                      <button onClick={() => { setConverting(false); setConvertSearch(''); }} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', justifySelf: 'start' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConverting(true)} style={{ ...primaryBtn, padding: '6px 14px', fontSize: 13 }}>
                      Convert to member
                    </button>
                  )}
                </div>
                <ContactButtons key={selected.lead._id} lead={selected.lead} />
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log a note / call…" style={{ ...input, flex: 1 }} />
                  <button
                    onClick={async () => { if (selectedId && note) { await logInteraction({ leadId: selectedId as any, channel: 'note', summary: note }); setNote(''); } }}
                    style={primaryBtn}
                  >
                    Log
                  </button>
                </div>
              </>
            )}
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-elevated)' }}>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Follow-up tasks</h2>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="New task…" style={{ ...input, flex: 1 }} />
              <button
                onClick={async () => { if (taskTitle) { await assignTask({ title: taskTitle, leadId: selectedId as any ?? undefined }); setTaskTitle(''); } }}
                style={primaryBtn}
              >
                Add
              </button>
            </div>
            {!tasks ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading tasks…</p>
            ) : tasks.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No open tasks due. Nothing needs follow-up.</p>
            ) : (
              <ul style={{ fontSize: 13, paddingLeft: 18, display: 'grid', gap: 6 }}>
                {tasks.map((t: any) => (
                  <li key={t._id}>
                    {t.title}
                    {t.dueAt && <span style={{ color: 'var(--text-muted)' }}> · due {new Date(t.dueAt).toLocaleDateString()}</span>}
                    {' '}<button onClick={() => completeTask({ taskId: t._id })} style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Done</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
    </RequireAuth>
  );
}

const input: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)' };
const primaryBtn: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontWeight: 600 };

/** WhatsApp + email deep links with the stage template, editable before sending. */
function ContactButtons({ lead }: { lead: any }) {
  const [text, setText] = useState(stageMessage(lead.stage, lead.name ?? ''));
  const wa = buildWhatsAppUrl(lead.phone, text);
  const mail = buildMailtoUrl(lead.email, lead.stage, text);
  if (!wa && !mail) return null;
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{ ...input, resize: 'vertical', fontSize: 13 }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" style={{ ...primaryBtn, background: '#25D366', textDecoration: 'none', fontSize: 13 }}>
            WhatsApp
          </a>
        )}
        {mail && (
          <a href={mail} style={{ ...primaryBtn, fontSize: 13, textDecoration: 'none' }}>
            Email
          </a>
        )}
      </div>
    </div>
  );
}

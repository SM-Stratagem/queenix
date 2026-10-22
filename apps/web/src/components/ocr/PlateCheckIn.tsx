'use client';
/**
 * Valet desk check-in: "Scan plate" (or type it) → matches members' saved
 * vehicles → pick member → check in (valet.staffCheckIn).
 */
import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api, type OcrResult } from '@queenix/convex';
import { errMsg } from '@/lib/errors';
import { ScanButton, ScanNotice, button, input, panel } from './ScanKit';

export function PlateCheckIn() {
  const [plate, setPlate] = useState('');
  const [result, setResult] = useState<OcrResult | null>(null);
  const [memberId, setMemberId] = useState('');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const checkIn = useMutation(api.mutations.valet.staffCheckIn);
  const matches = useQuery(api.queries.valet.membersByPlate, plate.trim().length >= 2 ? { plate } : 'skip');
  const directory = useQuery(
    api.queries.users.getMembersDirectory,
    search.trim().length >= 2 ? { search, limit: 8 } : 'skip'
  );

  function onScan(r: OcrResult) {
    setResult(r);
    setPlate(r.fields?.plate ?? [r.fields?.code, r.fields?.number].filter(Boolean).join(' '));
    setMemberId('');
    setMsg(null);
  }

  // First plate match prefills the member unless staff already picked one.
  const chosen = memberId || (matches?.[0]?.userId as string | undefined) || '';
  const options = [
    ...(matches ?? []).map((m: any) => ({ id: String(m.userId), label: `${m.fullName} · ${m.vehicle.plate} (plate match)` })),
    ...(directory ?? []).map((d: any) => ({ id: String(d.user._id), label: `${d.user.fullName} · ${d.user.email}` })),
  ].filter((o, i, all) => all.findIndex((x) => x.id === o.id) === i);

  async function submit() {
    setMsg(null);
    try {
      await checkIn({ userId: chosen as any, plate });
      setMsg(`Checked in ${plate.toUpperCase()}.`);
      setPlate('');
      setResult(null);
      setMemberId('');
      setSearch('');
    } catch (e) {
      setMsg(errMsg(e, 'Check-in failed.'));
    }
  }

  return (
    <section style={{ ...panel, margin: '12px 0' }} aria-label="Valet check-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <strong>Check in a car</strong>
        <ScanButton kind="plate" label="Scan plate" onResult={onScan} />
      </div>
      {result && <ScanNotice result={result} />}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input aria-label="Plate" placeholder="Plate" value={plate} onChange={(e) => setPlate(e.target.value)} style={{ ...input, width: 150 }} />
        <input aria-label="Find member" placeholder="Find member (name/email)" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...input, width: 200 }} />
        <select aria-label="Member" value={chosen} onChange={(e) => setMemberId(e.target.value)} style={{ ...input, minWidth: 240 }}>
          <option value="">{matches && matches.length === 0 ? 'No saved vehicle matches — pick a member' : 'Pick a member'}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <button onClick={submit} disabled={!chosen || plate.trim().length < 2} style={{ ...button, background: 'var(--brand)', color: '#fff' }}>
          Check in
        </button>
      </div>
      {msg && <p style={{ fontSize: 13, margin: 0 }}>{msg}</p>}
    </section>
  );
}

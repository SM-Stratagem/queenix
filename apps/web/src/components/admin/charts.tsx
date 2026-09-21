'use client';

import React from 'react';
import { formatMoney } from './QueryBoundary';

export type RevenuePoint = { key: string; label: string; cents: number };

/** Lightweight SVG line/area chart — no chart dependency required. */
export function RevenueChart({ points, currency }: { points: RevenuePoint[]; currency: string }) {
  const W = 640;
  const H = 220;
  const PAD = 32;
  const max = Math.max(1, ...points.map((p) => p.cents));
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const x = (i: number) => PAD + i * stepX;
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.cents).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Revenue over the last 14 days">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth={1} />
        <path d={area} fill="var(--brand)" opacity={0.12} />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) =>
          i % 2 === 0 ? (
            <text key={p.key} x={x(i)} y={H - 10} fontSize={10} fill="var(--text-muted)" textAnchor="middle">
              {p.label}
            </text>
          ) : null
        )}
        <text x={PAD} y={18} fontSize={11} fill="var(--text-muted)">
          {formatMoney(max, currency)} max
        </text>
      </svg>
    </div>
  );
}

export type GrowthPoint = { key: string; label: string; value: number };

/** Cumulative line/area chart for member growth — months on x, members on y. */
export function GrowthChart({ points }: { points: GrowthPoint[] }) {
  const W = 640;
  const H = 220;
  const PAD = 32;
  const max = Math.max(1, ...points.map((p) => p.value));
  const min = Math.min(0, ...points.map((p) => p.value));
  const span = Math.max(1, max - min);
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const x = (i: number) => PAD + i * stepX;
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Total members by month">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth={1} />
        <path d={area} fill="var(--brand)" opacity={0.12} />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.key}>
            <circle cx={x(i)} cy={y(p.value)} r={3.5} fill="var(--brand)" stroke="var(--bg-elevated)" strokeWidth={1.5} />
            {i % 2 === 0 ? (
              <text x={x(i)} y={H - 10} fontSize={10} fill="var(--text-muted)" textAnchor="middle">
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
        <text x={PAD} y={18} fontSize={11} fill="var(--text-muted)">
          {max.toLocaleString('en-AE')} members
        </text>
      </svg>
    </div>
  );
}

export type StatusBucket = { label: string; count: number; color: string };

/** Horizontal bars for membership-status mix. */
export function StatusBars({ buckets }: { buckets: StatusBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {buckets.map((b) => (
        <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 40px', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
            {b.label}
          </span>
          <div style={{ height: 10, background: 'var(--bg-muted)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(b.count / max) * 100}%`,
                height: '100%',
                background: b.color,
                borderRadius: 999,
                minWidth: b.count > 0 ? 6 : 0,
              }}
            />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{b.count}</span>
        </div>
      ))}
    </div>
  );
}

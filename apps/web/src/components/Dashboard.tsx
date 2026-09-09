'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ScanLine,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

interface ScannerDevice {
  _id: string;
  deviceId: string;
  name: string;
  location: string;
  model?: string;
  lastSeenAt: number | null;
  lastScanAt: number | null;
  totalScans: number;
  online: boolean;
}

interface ScannerHealth {
  online: boolean;
  deviceCount: number;
  onlineCount: number;
  lastSeenAt: number | null;
  devices: ScannerDevice[];
}

const kpis = [
  {
    label: 'Active members',
    value: '247',
    delta: '+12 this week',
    deltaType: 'up' as const,
    icon: Users,
    color: '#0081cc',
  },
  {
    label: "Today's revenue",
    value: 'AED 4,820',
    delta: '+18% vs yesterday',
    deltaType: 'up' as const,
    icon: DollarSign,
    color: '#10b981',
  },
  {
    label: "Today's check-ins",
    value: '89',
    delta: '+5 vs yesterday',
    deltaType: 'up' as const,
    icon: Activity,
    color: '#8b5cf6',
  },
  {
    label: 'Live occupancy',
    value: '38/60',
    delta: '63% capacity',
    deltaType: 'neutral' as const,
    icon: Calendar,
    color: '#f59e0b',
  },
];

const alerts = [
  { id: 1, severity: 'high', message: '2 access scanners reported offline', time: '2m ago' },
  { id: 2, severity: 'medium', message: 'Trainer cert expiring: Layla Hassan (3 days)', time: '1h ago' },
  { id: 3, severity: 'low', message: '5 memberships expiring this week', time: '3h ago' },
];

const recentMembers = [
  { name: 'Amna Al-Suwaidi', tier: 'Premium', status: 'active', joined: '2 days ago' },
  { name: 'Reem Hassan', tier: 'Basic', status: 'trial', joined: '1 day ago' },
  { name: 'Maryam Al-Mansoori', tier: 'Premium', status: 'active', joined: '3 days ago' },
  { name: 'Fatima Al-Zaabi', tier: 'VIP', status: 'active', joined: '5 days ago' },
  { name: 'Noura Al-Suwaidi', tier: 'Basic', status: 'frozen', joined: '1 week ago' },
];

const upcomingClasses = [
  { name: 'Power Yoga', trainer: 'Maya Patel', time: '6:00 PM', booked: 18, capacity: 20 },
  { name: 'HIIT 45', trainer: 'Layla Hassan', time: '7:00 PM', booked: 20, capacity: 20 },
  { name: 'Pilates Reformer', trainer: 'Aisha Khan', time: '7:30 PM', booked: 12, capacity: 15 },
  { name: 'Strength 101', trainer: 'Sara Al-Mahri', time: '8:00 PM', booked: 8, capacity: 15 },
];

function formatRelative(ms: number | null): string {
  if (!ms) return '—';
  const delta = Date.now() - ms;
  if (delta < 60_000) return 'just now';
  if (delta < 3600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86400_000) return `${Math.floor(delta / 3600_000)}h ago`;
  return `${Math.floor(delta / 86400_000)}d ago`;
}

function ScannersSection() {
  const [health, setHealth] = useState<ScannerHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setError(null);
    try {
      const res = await fetch('/api/scanner/health', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth({
        online: true, // the bridge itself is up (200 OK)
        deviceCount: 0,
        onlineCount: 0,
        lastSeenAt: null,
        devices: [],
        ...data,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Bridge unreachable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 30_000);
    return () => clearInterval(id);
  }, []);

  const renderRow = (d: ScannerDevice) => (
    <div
      key={d.deviceId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        background: 'var(--bg-muted)',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: d.online ? '#10b98120' : '#ef444420',
          color: d.online ? 'var(--success)' : 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {d.online ? <Wifi size={18} /> : <WifiOff size={18} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {d.deviceId} • {d.location}
          {d.model ? ` • ${d.model}` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: d.online ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {d.online ? 'Online' : 'Offline'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          seen {formatRelative(d.lastSeenAt)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {d.totalScans} scans
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ScanLine size={18} color="var(--brand)" />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Connected scanners</h2>
          {health && health.deviceCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 999,
                background: health.onlineCount === health.deviceCount ? '#10b98120' : '#f59e0b20',
                color:
                  health.onlineCount === health.deviceCount ? 'var(--success)' : 'var(--warning)',
                textTransform: 'uppercase',
              }}
            >
              {health.onlineCount}/{health.deviceCount} online
            </span>
          )}
        </div>
        <button
          onClick={fetchHealth}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            padding: '6px 10px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
          }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading && !health ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 56,
                background: 'var(--bg-muted)',
                borderRadius: 10,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            padding: 12,
            background: '#ef444420',
            color: 'var(--danger)',
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          Scanner bridge unreachable. ({error})
        </div>
      ) : health && health.devices.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {health.devices.map(renderRow)}
        </div>
      ) : (
        <div
          style={{
            padding: 16,
            color: 'var(--text-muted)',
            textAlign: 'center',
            fontSize: 13,
          }}
        >
          No scanners registered yet. Run
          <code
            style={{
              background: 'var(--bg-muted)',
              padding: '2px 6px',
              borderRadius: 4,
              margin: '0 4px',
              fontSize: 12,
            }}
          >
            POST /api/scanner/register
          </code>
          to provision a device. See <code>docs/SCANNER_SETUP.md</code>.
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Tuesday, 9 September 2026 • Queenix Gym
        </p>
      </div>

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `${kpi.color}15`,
                    color: kpi.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} />
                </div>
                {kpi.deltaType === 'up' && <TrendingUp size={16} color="var(--success)" />}
                {kpi.deltaType === 'down' && <TrendingDown size={16} color="var(--danger)" />}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{kpi.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{kpi.value}</div>
              <div
                style={{
                  fontSize: 12,
                  color:
                    kpi.deltaType === 'up'
                      ? 'var(--success)'
                      : kpi.deltaType === 'down'
                      ? 'var(--danger)'
                      : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {kpi.delta}
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column layout: classes + alerts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
        }}
      >
        {/* Upcoming classes */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Today's classes</h2>
            <a style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, cursor: 'pointer' }}>
              View all
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingClasses.map((cls) => (
              <div
                key={cls.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 12,
                  background: 'var(--bg-muted)',
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--brand)',
                    minWidth: 60,
                  }}
                >
                  {cls.time}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{cls.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>with {cls.trainer}</div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{cls.booked}/{cls.capacity}</span>
                  <div
                    style={{
                      width: 60,
                      height: 4,
                      background: 'var(--border)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(cls.booked / cls.capacity) * 100}%`,
                        height: '100%',
                        background:
                          cls.booked / cls.capacity > 0.8 ? 'var(--warning)' : 'var(--brand)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Alerts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12,
                  background: 'var(--bg-muted)',
                  borderRadius: 10,
                  borderLeft: `3px solid ${
                    alert.severity === 'high'
                      ? 'var(--danger)'
                      : alert.severity === 'medium'
                      ? 'var(--warning)'
                      : 'var(--text-muted)'
                  }`,
                }}
              >
                <AlertCircle
                  size={18}
                  color={
                    alert.severity === 'high'
                      ? 'var(--danger)'
                      : alert.severity === 'medium'
                      ? 'var(--warning)'
                      : 'var(--text-muted)'
                  }
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{alert.message}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <Clock size={10} /> {alert.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connected scanners (NEW) */}
      <ScannersSection />

      {/* Recent members */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Recent members</h2>
          <a
            style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            View all <ArrowUpRight size={12} />
          </a>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Tier', 'Status', 'Joined'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '8px 0',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentMembers.map((m) => (
              <tr key={m.name} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 0', fontSize: 14, fontWeight: 500 }}>{m.name}</td>
                <td style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-muted)' }}>{m.tier}</td>
                <td style={{ padding: '12px 0' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background:
                        m.status === 'active' ? '#10b98120' : m.status === 'trial' ? '#0081cc20' : '#f59e0b20',
                      color:
                        m.status === 'active' ? 'var(--success)' : m.status === 'trial' ? 'var(--brand)' : 'var(--warning)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {m.status}
                  </span>
                </td>
                <td style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-muted)' }}>{m.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

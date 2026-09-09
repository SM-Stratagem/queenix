'use client';

import React from 'react';
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
} from 'lucide-react';

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

      {/* Two-column layout */}
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

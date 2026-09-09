'use client';

import React, { useState } from 'react';
import { YStack, XStack, Text, View } from 'tamagui';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  Dumbbell,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Coffee,
  Scissors,
} from 'lucide-react';

const navSections = [
  {
    title: 'Operations',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
      { key: 'members', label: 'Members', icon: Users, badge: '247' },
      { key: 'classes', label: 'Classes', icon: Calendar, badge: '12' },
      { key: 'trainers', label: 'Trainers', icon: Dumbbell, badge: null },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { key: 'memberships', label: 'Memberships', icon: CreditCard, badge: null },
      { key: 'payments', label: 'Payments', icon: CreditCard, badge: null },
    ],
  },
  {
    title: 'Partners',
    items: [
      { key: 'coffee', label: 'Coffee', icon: Coffee, badge: 'NEW' },
      { key: 'salon', label: 'Salon', icon: Scissors, badge: 'NEW' },
    ],
  },
  {
    title: 'System',
    items: [
      { key: 'settings', label: 'Settings', icon: Settings, badge: null },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [activeKey, setActiveKey] = useState('dashboard');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gridTemplateRows: '60px 1fr',
        gridTemplateAreas: '"sidebar header" "sidebar main"',
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          gridArea: 'sidebar',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          padding: '20px 0',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '0 24px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            Q
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Queenix</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Admin</div>
          </div>
        </div>

        {navSections.map((section) => (
          <div key={section.title} style={{ marginBottom: 16 }}>
            <div
              style={{
                padding: '8px 24px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeKey;
              return (
                <div
                  key={item.key}
                  onClick={() => setActiveKey(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 24px',
                    cursor: 'pointer',
                    background: active ? 'var(--brand-light)' : 'transparent',
                    color: active ? 'var(--brand)' : 'var(--text)',
                    borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={18} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: active ? 'var(--brand)' : 'var(--bg-muted)',
                        color: active ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </aside>

      {/* Header */}
      <header
        style={{
          gridArea: 'header',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            width: 320,
          }}
        >
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search members, trainers, classes…"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              flex: 1,
              fontSize: 14,
              color: 'var(--text)',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              position: 'relative',
            }}
          >
            <Bell size={20} color="var(--text)" />
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                background: 'var(--danger)',
                borderRadius: '50%',
              }}
            />
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px 4px 4px',
              borderRadius: 999,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--brand)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              LM
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Layla Al-Mansoori</div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          gridArea: 'main',
          overflow: 'auto',
          padding: 24,
          background: 'var(--bg-muted)',
        }}
      >
        {children}
      </main>
    </div>
  );
}

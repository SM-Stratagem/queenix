import React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

export type Kpi = {
  label: string
  value: string
  delta?: string
  deltaType?: "up" | "down" | "neutral"
  icon: any
  color: string
}

const tileStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
  boxShadow: "var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))",
}

const valueStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: "var(--text-primary)",
}

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
      }}
    >
      {kpis.map((k) => {
        const Icon = k.icon
        return (
          <div key={k.label} style={tileStyle} className="kpi-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${k.color}20`,
                  color: k.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={18} />
              </div>
              {k.deltaType && k.deltaType !== "neutral" && k.delta && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color:
                      k.deltaType === "up"
                        ? "var(--success-500, #10b981)"
                        : "var(--danger-500, #ef4444)",
                  }}
                >
                  {k.deltaType === "up" ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {k.delta}
                </div>
              )}
              {k.deltaType === "neutral" && k.delta && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  {k.delta}
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
              {k.label}
            </div>
            <div style={valueStyle}>{k.value}</div>
          </div>
        )
      })}
    </div>
  )
}

export type Alert = {
  id: number | string
  severity: "high" | "medium" | "low"
  message: string
  time: string
}

const SEVERITY_COLORS = {
  high: { bg: "var(--danger-50, #fee2e2)", fg: "var(--danger-700, #b91c1c)" },
  medium: { bg: "var(--warning-50, #fef3c7)", fg: "var(--warning-700, #b45309)" },
  low: { bg: "var(--info-50, #dbeafe)", fg: "var(--info-700, #1d4ed8)" },
} as const

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        boxShadow: "var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
          color: "var(--text-primary)",
        }}
      >
        Alerts
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {alerts.map((a) => {
          const c = SEVERITY_COLORS[a.severity]
          return (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 10,
                borderRadius: 8,
                background: c.bg,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: c.fg,
                }}
              />
              <div style={{ flex: 1, color: c.fg }}>{a.message}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.time}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

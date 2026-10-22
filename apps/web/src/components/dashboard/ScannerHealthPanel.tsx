"use client"

import React from "react"
import { useQuery } from "convex/react"
import { api } from "@queenix/convex"
import { Wifi, WifiOff } from "lucide-react"

function formatRelative(ms: number | null | undefined): string {
  if (!ms) return "—"
  const delta = Date.now() - ms
  if (delta < 60_000) return "just now"
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`
  return `${Math.floor(delta / 86_400_000)}d ago`
}

/**
 * Registered scanners + heartbeat status from queries/access:getScannerHealth
 * (scannerDevices, online = heartbeat in the last 2 min). Live Convex
 * subscription, so no polling/refresh. Errors go to the caller's QueryBoundary.
 */
export function ScannerHealthPanel() {
  const health = useQuery(api.queries.access.getScannerHealth, {})
  const loading = health === undefined
  const devices = health?.devices ?? []
  const onlineCount = health?.onlineCount ?? 0

  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Scanner health
          </h2>
          {health && (
            <span
              style={{
                fontSize: 12,
                background: health.online ? "#10b98120" : "#ef444420",
                color: health.online ? "var(--success)" : "var(--danger)",
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              {onlineCount}/{devices.length} online
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 56,
                background: "var(--bg-muted)",
                borderRadius: 10,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          No scanners registered. Register a device with POST /api/scanner/register.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {devices.map((d) => (
            <div
              key={d.deviceId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                background: "var(--bg-muted)",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: d.online ? "#10b98120" : "#ef444420",
                  color: d.online ? "var(--success)" : "var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {d.online ? <Wifi size={18} /> : <WifiOff size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {d.location} · {formatRelative(d.lastSeenAt)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {d.totalScans} scans
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

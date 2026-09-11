"use client"

import React, { useEffect, useState } from "react"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"

export interface ScannerDevice {
  _id: string
  deviceId: string
  name: string
  location: string
  model?: string
  lastSeenAt: number | null
  lastScanAt: number | null
  totalScans: number
  online: boolean
}

export interface ScannerHealth {
  online: boolean
  deviceCount?: number
  onlineCount?: number
  lastSeenAt?: number | null
  devices: ScannerDevice[]
}

function formatRelative(ms: number | null | undefined): string {
  if (!ms) return "—"
  const delta = Date.now() - ms
  if (delta < 60_000) return "just now"
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`
  return `${Math.floor(delta / 86_400_000)}d ago`
}

export function ScannerHealthPanel() {
  const [health, setHealth] = useState<ScannerHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = async () => {
    setError(null)
    try {
      const res = await fetch("/api/scanner/health", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setHealth({
        online: true,
        devices: [],
        deviceCount: 0,
        onlineCount: 0,
        lastSeenAt: null,
        ...data,
      })
    } catch (e: any) {
      setError(e?.message ?? "Bridge unreachable")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const id = setInterval(fetchHealth, 30_000)
    return () => clearInterval(id)
  }, [])

  const devices = health?.devices ?? []
  const onlineCount = devices.filter((d) => d.online).length

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
          {!loading && health && (
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
        <button
          onClick={fetchHealth}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            padding: "6px 10px",
            borderRadius: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
          }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading && !health ? (
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
      ) : error ? (
        <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>
      ) : devices.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          No scanners registered. Visit /api/scanner/register to add one.
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

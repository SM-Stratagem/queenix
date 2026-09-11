import React from "react"
import {
  ShieldAlert,
  Wrench,
  HardHat,
  MessageCircleWarning,
  Info,
} from "@tamagui/lucide-icons"

export type Severity = "low" | "medium" | "high" | "critical"
export type IncidentType =
  | "access_denied"
  | "equipment"
  | "safety"
  | "complaint"
  | "other"
export type IncidentStatus = "open" | "in_progress" | "resolved"

export type SeverityTone = "critical" | "high" | "medium" | "low"

export type TypeMeta = {
  label: string
  icon: React.ReactNode
  bg: string
  fg: string
}

export const TYPE_META: Record<IncidentType, TypeMeta> = {
  access_denied: {
    label: "Access denied",
    icon: <ShieldAlert size={18} color="$danger" />,
    bg: "$danger100",
    fg: "$danger",
  },
  equipment: {
    label: "Equipment",
    icon: <Wrench size={18} color="$warning" />,
    bg: "$warning100",
    fg: "$warning",
  },
  safety: {
    label: "Safety",
    icon: <HardHat size={18} color="$warning" />,
    bg: "$warning100",
    fg: "$warning",
  },
  complaint: {
    label: "Complaint",
    icon: <MessageCircleWarning size={18} color="$info" />,
    bg: "$info100",
    fg: "$info",
  },
  other: {
    label: "Other",
    icon: <Info size={18} color="$textMuted" />,
    bg: "$surfaceMuted",
    fg: "$textMuted",
  },
}

export const SEVERITY_META: Record<
  Severity,
  { label: string; variant: "success" | "info" | "warning" | "danger" }
> = {
  low: { label: "Low", variant: "success" },
  medium: { label: "Medium", variant: "info" },
  high: { label: "High", variant: "warning" },
  critical: { label: "Critical", variant: "danger" },
}

export const STATUS_META: Record<
  IncidentStatus,
  { label: string; variant: "neutral" | "info" | "success" }
> = {
  open: { label: "Open", variant: "info" },
  in_progress: { label: "In progress", variant: "info" },
  resolved: { label: "Resolved", variant: "success" },
}

export type Incident = {
  id: string
  code: string
  type: IncidentType
  severity: Severity
  title: string
  location: string
  reportedBy: string
  reportedByInitials: string
  timeAgo: string
  status: IncidentStatus
  description: string
  createdAt: number
}

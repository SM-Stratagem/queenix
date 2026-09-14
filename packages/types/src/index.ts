/**
 * Queenix Gym — Shared types entry point.
 *
 * Schemas are organized by domain under ./schemas. This file re-exports
 * them so consumers (`import { UserSchema } from '@queenix/types'`) keep
 * working unchanged.
 */

export * from './schemas/identity'
export * from './schemas/member'
export * from './schemas/membership'
export * from './schemas/payments'
export * from './schemas/documents'
export * from './schemas/access'
export * from './schemas/classes'
export * from './schemas/operations'

// ============================================================
// API Response wrapper
// ============================================================

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } }

// ============================================================
// Helpers (formatting only — no DB or auth)
// ============================================================

export const formatCurrency = (cents: number, currency = 'AED'): string => {
  const amount = cents / 100
  return `${currency} ${amount.toFixed(2)}`
}

export const formatDate = (timestamp: number, locale = 'en-US'): string => {
  return new Date(timestamp).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatDateTime = (timestamp: number, locale = 'en-US'): string => {
  return new Date(timestamp).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatTime = (timestamp: number, locale = 'en-US'): string => {
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

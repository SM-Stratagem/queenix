/**
 * Queenix Gym — Payment schemas
 */

import { z } from 'zod'

export const PaymentStatusSchema = z.enum([
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'cancelled',
])
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>

export const PaymentSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  amountCents: z.number().int(),
  currency: z.string().default('AED'),
  status: PaymentStatusSchema,
  type: z.enum(['membership', 'pt_package', 'event', 'other']),
  description: z.string(),
  stripePaymentIntentId: z.string().optional(),
  invoiceUrl: z.string().url().optional(),
  receiptUrl: z.string().url().optional(),
  idempotencyKey: z.string(),
  createdAt: z.number(),
})
export type Payment = z.infer<typeof PaymentSchema>

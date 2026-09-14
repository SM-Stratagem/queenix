/**
 * Queenix Gym — Document schemas
 */

import { z } from 'zod'

export const DocumentTypeSchema = z.enum([
  'membership_agreement',
  'liability_waiver',
  'health_declaration',
  'gym_rules',
  'par_q',
  'trainer_contract',
  'photo_consent',
])
export type DocumentType = z.infer<typeof DocumentTypeSchema>

export const DocumentTemplateSchema = z.object({
  _id: z.string(),
  type: DocumentTypeSchema,
  version: z.string(),
  title: z.string(),
  content: z.string(),
  required: z.boolean().default(true),
  effectiveDate: z.number(),
  expiresAt: z.number().optional(),
})
export type DocumentTemplate = z.infer<typeof DocumentTemplateSchema>

export const SignatureSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  templateId: z.string(),
  documentVersion: z.string(),
  signedAt: z.number(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  signatureData: z.string(),
})
export type Signature = z.infer<typeof SignatureSchema>

// ============================================================
// Verity — Runtime Schema Validation
// Zod schemas that mirror types.ts and validate real data
// coming off the chain before it enters the system.
// ============================================================

import { z } from 'zod'
import {
  ChainId,
  ChainName,
  TxStatus,
  ContractClass,
  RiskLevel,
} from './types'

// ------ Enums -----------------------------------------------

export const ChainIdSchema = z.nativeEnum(ChainId)
export const ChainNameSchema = z.nativeEnum(ChainName)
export const TxStatusSchema = z.nativeEnum(TxStatus)
export const ContractClassSchema = z.nativeEnum(ContractClass)
export const RiskLevelSchema = z.nativeEnum(RiskLevel)

// ------ Risk Signal -----------------------------------------

export const RiskSignalSchema = z.object({
  level      : RiskLevelSchema,
  reason     : z.string().min(1),
  confidence : z.number().min(0).max(1),
})

// ------ Core Intelligence Record ----------------------------
// Every chain adapter must produce data that passes this schema.
// If it doesn't, it gets rejected before touching storage.

export const IntelligenceRecordSchema = z.object({
  id            : z.string().uuid(),
  chainId       : ChainIdSchema,
  chainName     : ChainNameSchema,
  blockNumber   : z.number().int().positive(),
  txHash        : z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  from          : z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  to            : z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable(),
  status        : TxStatusSchema,
  failureReason : z.string().nullable(),
  contractClass : ContractClassSchema,
  riskSignals   : z.array(RiskSignalSchema),
  gasUsed       : z.bigint(),
  gasLimit      : z.bigint(),
  timestamp     : z.number().int().positive(),
  processedAt   : z.number().int().positive(),
})

// ------ API Key ---------------------------------------------

export const ApiKeySchema = z.object({
  key         : z.string().min(32),
  ownerId     : z.string().uuid(),
  tier        : z.enum(['free', 'builder', 'pro', 'enterprise']),
  queriesUsed : z.number().int().min(0),
  queryLimit  : z.number().int().positive(),
  chains      : z.array(ChainIdSchema),
  createdAt   : z.number().int().positive(),
})

// ------ Query Params ----------------------------------------

export const IntelligenceQuerySchema = z.object({
  chainId       : ChainIdSchema.optional(),
  status        : TxStatusSchema.optional(),
  contractClass : ContractClassSchema.optional(),
  riskLevel     : RiskLevelSchema.optional(),
  fromBlock     : z.number().int().positive().optional(),
  toBlock       : z.number().int().positive().optional(),
  limit         : z.number().int().min(1).max(500).default(50),
  offset        : z.number().int().min(0).default(0),
})

// ------ Inferred Types --------------------------------------
// These let other files do:
//   import type { IntelligenceRecordInput } from '../shared/schema'
// and get full TypeScript inference from the Zod schema.

export type IntelligenceRecordInput = z.infer<typeof IntelligenceRecordSchema>
export type ApiKeyInput = z.infer<typeof ApiKeySchema>
export type IntelligenceQueryInput = z.infer<typeof IntelligenceQuerySchema>
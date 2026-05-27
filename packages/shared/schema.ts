// ============================================================
// Verity — Runtime Schema Validation
// ============================================================

import { z } from 'zod'
import {
  ChainId, ChainName, TxStatus, ContractClass, RiskLevel, SignalType,
} from './types'

export const ChainIdSchema        = z.nativeEnum(ChainId)
export const ChainNameSchema      = z.nativeEnum(ChainName)
export const TxStatusSchema       = z.nativeEnum(TxStatus)
export const ContractClassSchema  = z.nativeEnum(ContractClass)
export const RiskLevelSchema      = z.nativeEnum(RiskLevel)
export const SignalTypeSchema     = z.nativeEnum(SignalType)

export const RiskSignalSchema = z.object({
  level      : RiskLevelSchema,
  reason     : z.string().min(1),
  signalType : SignalTypeSchema,
  confidence : z.number().min(0).max(1),
})

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
  value         : z.bigint(),
  timestamp     : z.number().int().positive(),
  processedAt   : z.number().int().positive(),
})

export const ApiKeySchema = z.object({
  key         : z.string().min(32),
  ownerId     : z.string().uuid(),
  tier        : z.enum(['free', 'builder', 'pro', 'enterprise']),
  queriesUsed : z.number().int().min(0),
  queryLimit  : z.number().int().positive(),
  chains      : z.array(ChainIdSchema),
  createdAt   : z.number().int().positive(),
})

export const IntelligenceQuerySchema = z.object({
  chainId       : ChainIdSchema.optional(),
  status        : TxStatusSchema.optional(),
  contractClass : ContractClassSchema.optional(),
  riskLevel     : RiskLevelSchema.optional(),
  signalType    : SignalTypeSchema.optional(),
  fromBlock     : z.number().int().positive().optional(),
  toBlock       : z.number().int().positive().optional(),
  limit         : z.number().int().min(1).max(500).default(50),
  offset        : z.number().int().min(0).default(0),
})

export type IntelligenceRecordInput = z.infer<typeof IntelligenceRecordSchema>
export type ApiKeyInput             = z.infer<typeof ApiKeySchema>
export type IntelligenceQueryInput  = z.infer<typeof IntelligenceQuerySchema>
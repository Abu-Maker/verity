// ============================================================
// Verity — Shared Types
// Foundation for all packages. Every chain adapter, scanner,
// API route, and agent imports from here.
// ============================================================

// ------ Supported Chains ------------------------------------

export enum ChainId {
  ETHEREUM  = 1,
  BASE      = 8453,
  ARBITRUM  = 42161,
}

export enum ChainName {
  ETHEREUM  = 'ethereum',
  BASE      = 'base',
  ARBITRUM  = 'arbitrum',
}

export interface ChainConfig {
  chainId   : ChainId
  name      : ChainName
  rpcUrl    : string
  blockTime : number   // average ms between blocks
}

// ------ Transaction Status ----------------------------------

export enum TxStatus {
  SUCCESS  = 'success',
  FAILED   = 'failed',
  REVERTED = 'reverted',
  PENDING  = 'pending',
}

// ------ Contract Classification -----------------------------

export enum ContractClass {
  DEX          = 'dex',
  LENDING      = 'lending',
  BRIDGE       = 'bridge',
  NFT          = 'nft',
  STABLECOIN   = 'stablecoin',
  GOVERNANCE   = 'governance',
  UNKNOWN      = 'unknown',
}

// ------ Risk Signals ----------------------------------------

export enum RiskLevel {
  LOW      = 'low',
  MEDIUM   = 'medium',
  HIGH     = 'high',
  CRITICAL = 'critical',
}

export interface RiskSignal {
  level       : RiskLevel
  reason      : string
  confidence  : number   // 0-1
}

// ------ Core Intelligence Schema ----------------------------
// This is the normalized output every chain adapter produces.
// The API serves this shape. Customers never see chain-specific data.

export interface IntelligenceRecord {
  id              : string        // uuid
  chainId         : ChainId
  chainName       : ChainName
  blockNumber     : number
  txHash          : string
  from            : string
  to              : string | null
  status          : TxStatus
  failureReason   : string | null
  contractClass   : ContractClass
  riskSignals     : RiskSignal[]
  gasUsed         : bigint
  gasLimit        : bigint
  timestamp       : number        // unix ms
  processedAt     : number        // unix ms — when Verity classified it
}

// ------ API -------------------------------------------------

export interface ApiKey {
  key         : string
  ownerId     : string
  tier        : 'free' | 'builder' | 'pro' | 'enterprise'
  queriesUsed : number
  queryLimit  : number
  chains      : ChainId[]
  createdAt   : number
}

export interface UsageEvent {
  apiKey      : string
  endpoint    : string
  chainId     : ChainId
  timestamp   : number
  responseMs  : number
}

// ------ Agent -----------------------------------------------

export interface AgentDecision {
  triggeredAt   : number
  chainId       : ChainId
  action        : 'query' | 'alert' | 'skip'
  reason        : string
  usdcSpent     : number
}

// ------ Query Params ----------------------------------------

export interface IntelligenceQuery {
  chainId         ?: ChainId
  status          ?: TxStatus
  contractClass   ?: ContractClass
  riskLevel       ?: RiskLevel
  fromBlock       ?: number
  toBlock         ?: number
  limit           ?: number   // default 50, max 500
  offset          ?: number
}
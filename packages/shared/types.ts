// ============================================================
// Verity — Shared Types
// ============================================================

export enum ChainId {
  ETHEREUM = 11155111,
  BASE     = 84532,
  ARBITRUM = 421614,
}

export enum ChainName {
  ETHEREUM = 'ethereum-sepolia',
  BASE     = 'base-sepolia',
  ARBITRUM = 'arbitrum-sepolia',
}

export interface ChainConfig {
  chainId   : ChainId
  name      : ChainName
  rpcUrl    : string
  blockTime : number
}

export enum TxStatus {
  SUCCESS  = 'success',
  FAILED   = 'failed',
  REVERTED = 'reverted',
  PENDING  = 'pending',
}

export enum ContractClass {
  DEX        = 'dex',
  LENDING    = 'lending',
  BRIDGE     = 'bridge',
  NFT        = 'nft',
  STABLECOIN = 'stablecoin',
  GOVERNANCE = 'governance',
  MEV_BOT    = 'mev_bot',
  UNKNOWN    = 'unknown',
}

export enum RiskLevel {
  LOW      = 'low',
  MEDIUM   = 'medium',
  HIGH     = 'high',
  CRITICAL = 'critical',
}

// Signal types for exchange-grade classification
export enum SignalType {
  FAILED_TX        = 'failed_tx',
  GAS_EXHAUSTION   = 'gas_exhaustion',
  FLASH_LOAN       = 'flash_loan',
  SANDWICH_ATTACK  = 'sandwich_attack',
  WHALE_MOVEMENT   = 'whale_movement',
  MEV_BOT          = 'mev_bot',
  REVERT_STORM     = 'revert_storm',
  LARGE_APPROVAL   = 'large_approval',
}

export interface RiskSignal {
  level      : RiskLevel
  reason     : string
  signalType : SignalType
  confidence : number
}

export interface IntelligenceRecord {
  id            : string
  chainId       : ChainId
  chainName     : ChainName
  blockNumber   : number
  txHash        : string
  from          : string
  to            : string | null
  status        : TxStatus
  failureReason : string | null
  contractClass : ContractClass
  riskSignals   : RiskSignal[]
  gasUsed       : bigint
  gasLimit      : bigint
  value         : bigint
  timestamp     : number
  processedAt   : number
}

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
  apiKey     : string
  endpoint   : string
  chainId    : ChainId
  timestamp  : number
  responseMs : number
}

export interface AgentDecision {
  triggeredAt : number
  chainId     : ChainId
  action      : 'query' | 'alert' | 'skip'
  reason      : string
  usdcSpent   : number
}

export interface IntelligenceQuery {
  chainId       ?: ChainId
  status        ?: TxStatus
  contractClass ?: ContractClass
  riskLevel     ?: RiskLevel
  signalType    ?: SignalType
  fromBlock     ?: number
  toBlock       ?: number
  limit         ?: number
  offset        ?: number
}
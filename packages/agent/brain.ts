// ============================================================
// Verity — Agent Brain
// Decision logic. Runs every 5 minutes, queries the Verity
// API, classifies what it finds, and decides what to do.
// Migrated from ArcSense Lite's agentDecision.ts — now
// queries Verity's own API instead of Arc-specific endpoints.
// ============================================================

import axios from 'axios'
import { ChainId, RiskLevel, AgentDecision, IntelligenceRecord } from '@verity/shared'
import { hasSufficientBalance, payForQuery } from './wallet'
import { logger } from './logger'

const VERITY_API_URL    = process.env.VERITY_API_URL ?? 'http://localhost:3000'
const VERITY_API_KEY    = process.env.AGENT_API_KEY  ?? ''
const QUERY_COST_USDC   = 0.002
const PAYMENT_RECIPIENT = process.env.VERITY_PAYMENT_ADDRESS ?? ''

// ---- Query Verity API --------------------------------------

async function queryIntelligence(
  chainId  : ChainId,
  riskLevel: RiskLevel
): Promise<IntelligenceRecord[]> {
  const res = await axios.get(`${VERITY_API_URL}/v1/intelligence`, {
    headers: { 'x-api-key': VERITY_API_KEY },
    params : { chainId, riskLevel, limit: 20 },
  })

  return res.data?.data ?? []
}

// ---- Decide what to do -------------------------------------

export async function makeDecision(chainId: ChainId): Promise<AgentDecision> {
  logger.info(`Running decision cycle for chain ${chainId}`)

  // Check balance before querying
  const canAfford = await hasSufficientBalance(QUERY_COST_USDC)

  if (!canAfford) {
    return {
      triggeredAt : Date.now(),
      chainId,
      action      : 'skip',
      reason      : 'Insufficient USDC balance to pay for query',
      usdcSpent   : 0,
    }
  }

  // Pay for the query
  const payment = await payForQuery(
    PAYMENT_RECIPIENT,
    QUERY_COST_USDC,
    `intelligence query — chain ${chainId}`
  )

  if (!payment.success) {
    return {
      triggeredAt : Date.now(),
      chainId,
      action      : 'skip',
      reason      : 'Payment failed — skipping query',
      usdcSpent   : 0,
    }
  }

  // Query for high risk signals
  const records = await queryIntelligence(chainId, RiskLevel.HIGH)

  if (records.length === 0) {
    logger.decision('No high risk signals detected', { chainId })

    return {
      triggeredAt : Date.now(),
      chainId,
      action      : 'query',
      reason      : 'Queried successfully — no high risk signals found',
      usdcSpent   : QUERY_COST_USDC,
    }
  }

  // High risk signals found — alert
  logger.decision(`Found ${records.length} high risk signals`, {
    chainId,
    samples: records.slice(0, 3).map(r => ({
      txHash  : r.txHash,
      signals : r.riskSignals.map(s => s.reason),
    })),
  })

  return {
    triggeredAt : Date.now(),
    chainId,
    action      : 'alert',
    reason      : `Detected ${records.length} high risk transactions`,
    usdcSpent   : QUERY_COST_USDC,
  }
}
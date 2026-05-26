// ============================================================
// Verity — Autonomous Agent
// ============================================================
import * as dotenv from 'dotenv'
dotenv.config()

import { ChainId } from '@verity/shared'
import { makeDecision } from './brain'
import { getWalletBalance } from './wallet'
import { logger } from './logger'

const INTERVAL_MS = parseInt(process.env.AGENT_INTERVAL ?? '300000')
const CHAINS      = [ChainId.ETHEREUM, ChainId.BASE, ChainId.ARBITRUM]

async function run() {
  logger.info('Verity Agent starting up')
  logger.info(`Interval: ${INTERVAL_MS}ms`)

  try {
    const balance = await getWalletBalance()
    logger.info(`Wallet balance: ${balance} USDC`)
  } catch (err) {
    logger.warn('Could not fetch wallet balance on startup')
  }

  // Run immediately on start, then on interval
  await tick()

  setInterval(async () => {
    try {
      await tick()
    } catch (err) {
      logger.error('Tick failed unexpectedly', err)
    }
  }, INTERVAL_MS)
}

async function tick() {
  logger.info('--- Agent tick starting ---')
  for (const chainId of CHAINS) {
    try {
      const decision = await makeDecision(chainId)
      logger.decision(`Chain ${chainId} — action: ${decision.action}`, {
        reason   : decision.reason,
        usdcSpent: decision.usdcSpent,
      })
    } catch (err) {
      logger.error(`Decision cycle failed for chain ${chainId}`, err)
    }
  }
  logger.info('--- Agent tick complete ---')
}

process.on('SIGINT',  () => { logger.info('Agent shutting down'); process.exit(0) })
process.on('SIGTERM', () => { logger.info('Agent shutting down'); process.exit(0) })

run().catch(err => {
  logger.error('Fatal agent error', err)
  process.exit(1)
})
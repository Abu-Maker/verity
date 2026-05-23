// ============================================================
// Verity — Autonomous Agent
// Runs every 5 minutes across all configured chains.
// Makes decisions, pays for intelligence, logs everything.
// ============================================================

import * as dotenv from 'dotenv'
dotenv.config()

import { ChainId } from '@verity/shared'
import { makeDecision } from './brain'
import { getWalletBalance } from './wallet'
import { logger } from './logger'

// ---- Config ------------------------------------------------

const INTERVAL_MS = parseInt(process.env.AGENT_INTERVAL ?? '300000') // 5 min
const CHAINS      = [ChainId.ETHEREUM, ChainId.BASE, ChainId.ARBITRUM]

// ---- Main loop ---------------------------------------------

async function run() {
  logger.info('Verity Agent starting up')

  const balance = await getWalletBalance()
  logger.info(`Wallet balance: ${balance} USDC`)

  // Run immediately on start, then on interval
  await tick()

  setInterval(async () => {
    await tick()
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

// ---- Shutdown gracefully -----------------------------------

process.on('SIGINT',  () => { logger.info('Agent shutting down'); process.exit(0) })
process.on('SIGTERM', () => { logger.info('Agent shutting down'); process.exit(0) })

// ---- Start -------------------------------------------------

run().catch(err => {
  logger.error('Fatal agent error', err)
  process.exit(1)
})
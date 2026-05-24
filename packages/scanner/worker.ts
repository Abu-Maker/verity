// ============================================================
// Verity — Scanner Worker
// One instance runs per chain on Railway.
// Reads every block, passes it through the EVM adapter,
// and stores the intelligence records.
// ============================================================

import * as dotenv from 'dotenv'
dotenv.config()

import { EVMAdapter, getChainConfig } from './adapters/evm/adapter'
import { ChainId } from '@verity/shared'
import { saveRecords, getLastScannedBlock, saveLastScannedBlock } from './storage/state'

// ---- Config ------------------------------------------------

const CHAIN_ID      = parseInt(process.env.CHAIN_ID ?? '1') as ChainId
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? '5000')
const BATCH_SIZE    = parseInt(process.env.BATCH_SIZE ?? '5')

// ---- Main loop ---------------------------------------------

async function run() {
  const config  = getChainConfig(CHAIN_ID)
  const adapter = new EVMAdapter(config)

  console.log(`[Verity] Starting scanner for ${config.name}`)
  console.log(`[Verity] RPC: ${config.rpcUrl}`)

  const connected = await adapter.isConnected()
  if (!connected) {
    console.error(`[Verity] Cannot connect to ${config.name} RPC. Check your RPC env vars`)
    process.exit(1)
  }

  console.log(`[Verity] Connected to ${config.name} ✓`)

  let lastBlock: number

  const stored = await getLastScannedBlock(config.chainId)

  if (stored === null) {
    const tip = await adapter.getLatestBlock()
    lastBlock  = tip - 10
    console.log(`[Verity] First run. Starting from block ${lastBlock}`)
  } else {
    lastBlock = stored
    console.log(`[Verity] Resuming from block ${lastBlock}`)
  }

  // ---- Poll loop -------------------------------------------

  while (true) {
    try {
      const latestBlock = await adapter.getLatestBlock()

      if (lastBlock >= latestBlock) {
        await sleep(POLL_INTERVAL)
        continue
      }

      const toBlock = Math.min(lastBlock + BATCH_SIZE, latestBlock)

      for (let blockNum: number = lastBlock + 1; blockNum <= toBlock; blockNum++) {
        console.log(`[${config.name}] Scanning block ${blockNum}...`)

        const records = await adapter.fetchBlock(blockNum)

        if (records.length > 0) {
          await saveRecords(CHAIN_ID, records)
          console.log(`[${config.name}] Block ${blockNum} — ${records.length} records saved`)

          for (const record of records) {
            const critical = record.riskSignals.filter(
              s => s.level === 'high' || s.level === 'critical'
            )
            if (critical.length > 0) {
              console.warn(
                `[${config.name}] ⚠ HIGH RISK tx ${record.txHash} —`,
                critical.map(s => s.reason).join(', ')
              )
            }
          }
        } else {
          console.log(`[${config.name}] Block ${blockNum} — no records`)
        }

        await saveLastScannedBlock(config.chainId, blockNum)
        lastBlock = blockNum
      }

    } catch (err) {
      console.error(`[${config.name}] Scanner error:`, err)
      await sleep(POLL_INTERVAL * 2)
    }

    await sleep(POLL_INTERVAL)
  }
}

// ---- Helpers -----------------------------------------------

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

// ---- Shutdown gracefully -----------------------------------

process.on('SIGINT',  () => { console.log('\n[Verity] Shutting down...'); process.exit(0) })
process.on('SIGTERM', () => { console.log('\n[Verity] Shutting down...'); process.exit(0) })

// ---- Start -------------------------------------------------

run().catch(err => {
  console.error('[Verity] Fatal error:', err)
  process.exit(1)
})

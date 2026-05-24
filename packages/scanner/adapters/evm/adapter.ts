// ============================================================
// Verity — EVM Chain Adapter
// ============================================================

import { ethers } from 'ethers'
import { randomUUID } from 'crypto'
import {
  ChainConfig,
  ChainId,
  ChainName,
  TxStatus,
  ContractClass,
  RiskLevel,
  RiskSignal,
  IntelligenceRecord,
} from '@verity/shared'
import { IntelligenceRecordSchema } from '@verity/shared'

// ---- Helpers -----------------------------------------------

const wait = (ms: number) => new Promise(res => setTimeout(res, ms))

function is429(err: any): boolean {
  return (
    err?.error?.code === 429 ||
    err?.code === 429 ||
    (err?.message ?? '').includes('429') ||
    (err?.error?.message ?? '').includes('compute units')
  )
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 5
): Promise<T | null> {
  let delay = 1000
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      if (is429(err) && attempt < maxRetries) {
        await wait(delay)
        delay = Math.min(delay * 2, 16000) // cap at 16s
        continue
      }
      if (!is429(err)) {
        console.error(`[retry:${label}] Non-429 error:`, err?.shortMessage ?? err?.message)
      }
      return null
    }
  }
  return null
}

// ---- Adapter -----------------------------------------------

export class EVMAdapter {
  private provider : ethers.JsonRpcProvider
  private config   : ChainConfig

  constructor(config: ChainConfig) {
    this.config   = config
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, undefined, {
      staticNetwork: true,
    })
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber()
      return true
    } catch {
      return false
    }
  }

  async fetchBlock(blockNumber: number): Promise<IntelligenceRecord[]> {
    const block = await withRetry(
      () => this.provider.getBlock(blockNumber, true),
      `getBlock:${blockNumber}`
    )
    if (!block || !block.transactions) return []

    const records: IntelligenceRecord[] = []
    const BATCH_SIZE = 5
    const txs = block.prefetchedTransactions

    for (let i = 0; i < txs.length; i += BATCH_SIZE) {
      const batch = txs.slice(i, i + BATCH_SIZE)

      const results = await Promise.all(batch.map(async (tx) => {
        const receipt = await withRetry(
          () => this.provider.getTransactionReceipt(tx.hash),
          `receipt:${tx.hash.slice(0, 10)}`
        )
        if (!receipt) return null

        const status        = this.classifyStatus(receipt.status)
        const failureReason = status === TxStatus.FAILED
          ? await this.detectFailureReason(tx.hash)
          : null
        const contractClass = this.classifyContract(tx.to)
        const riskSignals   = this.generateRiskSignals(
          status,
          receipt.gasUsed,
          tx.gasLimit,
          failureReason
        )

        const record: IntelligenceRecord = {
          id            : randomUUID(),
          chainId       : this.config.chainId,
          chainName     : this.config.name,
          blockNumber   : block.number,
          txHash        : tx.hash,
          from          : tx.from,
          to            : tx.to ?? null,
          status,
          failureReason,
          contractClass,
          riskSignals,
          gasUsed       : receipt.gasUsed,
          gasLimit      : tx.gasLimit,
          timestamp     : block.timestamp * 1000,
          processedAt   : Date.now(),
        }

        const parsed = IntelligenceRecordSchema.safeParse(record)
        if (parsed.success) return record

        console.warn(`[${this.config.name}] Invalid record for ${tx.hash}:`, parsed.error.issues)
        return null
      }))

      for (const r of results) {
        if (r) records.push(r)
      }

      // Inter-batch delay — larger for fast chains to avoid 429 floods
      if (i + BATCH_SIZE < txs.length) {
        const delay = this.config.chainId === ChainId.ARBITRUM ? 300
                    : this.config.chainId === ChainId.BASE      ? 200
                    : 150
        await wait(delay)
      }
    }

    return records
  }

  async getLatestBlock(): Promise<number> {
    const result = await withRetry(
      () => this.provider.getBlockNumber(),
      'getLatestBlock'
    )
    if (result === null) throw new Error('Failed to get latest block after retries')
    return result
  }

  private classifyStatus(status: number | null): TxStatus {
    if (status === 1) return TxStatus.SUCCESS
    if (status === 0) return TxStatus.REVERTED
    return TxStatus.FAILED
  }

  private async detectFailureReason(txHash: string): Promise<string | null> {
    try {
      const tx = await this.provider.getTransaction(txHash)
      if (!tx) return null
      await this.provider.call({
        to    : tx.to ?? undefined,
        from  : tx.from,
        data  : tx.data,
        value : tx.value,
      })
      return null
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      if (msg.includes('execution reverted')) {
        const match = msg.match(/execution reverted: (.+)/)
        return match ? match[1] : 'execution reverted'
      }
      if (msg.includes('out of gas'))    return 'out of gas'
      if (msg.includes('nonce too low')) return 'nonce too low'
      if (msg.includes('insufficient'))  return 'insufficient funds'
      return msg.slice(0, 120) || 'unknown failure'
    }
  }

  private classifyContract(to: string | null): ContractClass {
    if (!to) return ContractClass.UNKNOWN
    const known: Record<string, ContractClass> = {
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': ContractClass.DEX,
      '0xe592427a0aece92de3edee1f18e0157c05861564': ContractClass.DEX,
      '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': ContractClass.LENDING,
    }
    return known[to.toLowerCase()] ?? ContractClass.UNKNOWN
  }

  private generateRiskSignals(
    status       : TxStatus,
    gasUsed      : bigint,
    gasLimit     : bigint,
    failureReason: string | null
  ): RiskSignal[] {
    const signals: RiskSignal[] = []

    if (status === TxStatus.FAILED || status === TxStatus.REVERTED) {
      signals.push({
        level      : RiskLevel.MEDIUM,
        reason     : failureReason ?? 'transaction failed',
        confidence : 0.95,
      })
    }

    if (gasLimit > 0n) {
      const utilization = Number(gasUsed) / Number(gasLimit)
      if (utilization > 0.95) {
        signals.push({
          level      : RiskLevel.HIGH,
          reason     : `gas utilization critical: ${(utilization * 100).toFixed(1)}%`,
          confidence : 0.9,
        })
      }
    }

    if (failureReason?.includes('out of gas')) {
      signals.push({
        level      : RiskLevel.HIGH,
        reason     : 'transaction ran out of gas',
        confidence : 1.0,
      })
    }

    return signals
  }
}

// ---- Chain configs -----------------------------------------

export function getChainConfig(chainId: ChainId): ChainConfig {
  const configs: Record<ChainId, ChainConfig> = {
    [ChainId.ETHEREUM]: {
      chainId  : ChainId.ETHEREUM,
      name     : ChainName.ETHEREUM,
      rpcUrl   : process.env.ETH_RPC_URL ?? '',
      blockTime: 12000,
    },
    [ChainId.BASE]: {
      chainId  : ChainId.BASE,
      name     : ChainName.BASE,
      rpcUrl   : process.env.BASE_RPC_URL ?? '',
      blockTime: 2000,
    },
    [ChainId.ARBITRUM]: {
      chainId  : ChainId.ARBITRUM,
      name     : ChainName.ARBITRUM,
      rpcUrl   : process.env.ARBITRUM_RPC_URL ?? '',
      blockTime: 250,
    },
  }
  return configs[chainId]
}
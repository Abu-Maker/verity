// ============================================================
// Verity — EVM Chain Adapter
// One instance of this class = one chain.
// Pass in a ChainConfig and it handles everything else.
// Ethereum, Base, Arbitrum all use this same adapter.
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

// ---- Wait helper -------------------------------------------

const wait = (ms: number) => new Promise(res => setTimeout(res, ms))

// ---- Adapter -----------------------------------------------

export class EVMAdapter {
  private provider : ethers.JsonRpcProvider
  private config   : ChainConfig

  constructor(config: ChainConfig) {
    this.config   = config
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl)
  }

  // -- Connection check ---------------------------------------

  async isConnected(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber()
      return true
    } catch {
      return false
    }
  }

  // -- Fetch a full block with receipts -----------------------

  async fetchBlock(blockNumber: number): Promise<IntelligenceRecord[]> {
    const block = await this.provider.getBlock(blockNumber, true)
    if (!block || !block.transactions) return []

    const records: IntelligenceRecord[] = []

    for (const tx of block.prefetchedTransactions) {
      try {
        const receipt = await this.provider.getTransactionReceipt(tx.hash)
        if (!receipt) continue

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

        // Validate before accepting
        const parsed = IntelligenceRecordSchema.safeParse(record)
        if (parsed.success) {
          records.push(record)
        } else {
          console.warn(
            `[${this.config.name}] Invalid record for ${tx.hash}:`,
            parsed.error.issues
          )
        }
      } catch (err) {
        console.error(`[${this.config.name}] Failed to process tx ${tx.hash}:`, err)
        continue
      }
    }

    return records
  }

  // -- Get current block number --------------------------------

  async getLatestBlock(): Promise<number> {
    return this.provider.getBlockNumber()
  }

  // -- Classify tx status from receipt ------------------------

  private classifyStatus(status: number | null): TxStatus {
    if (status === 1) return TxStatus.SUCCESS
    if (status === 0) return TxStatus.REVERTED
    return TxStatus.FAILED
  }

  // -- Detect why a tx failed ---------------------------------

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

  // -- Classify contract type from address --------------------

  private classifyContract(to: string | null): ContractClass {
    if (!to) return ContractClass.UNKNOWN

    const known: Record<string, ContractClass> = {
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': ContractClass.DEX,
      '0xe592427a0aece92de3edee1f18e0157c05861564': ContractClass.DEX,
      '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': ContractClass.LENDING,
    }

    return known[to.toLowerCase()] ?? ContractClass.UNKNOWN
  }

  // -- Generate risk signals ----------------------------------

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
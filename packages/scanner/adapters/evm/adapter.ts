// ============================================================
// Verity — EVM Chain Adapter
// Exchange-grade intelligence: flash loans, sandwich attacks,
// whale movements, MEV detection
// ============================================================

import { ethers } from 'ethers'
import { randomUUID } from 'crypto'
import {
  ChainConfig, ChainId, ChainName,
  TxStatus, ContractClass, RiskLevel, RiskSignal, SignalType,
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
        delay = Math.min(delay * 2, 16000)
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

// ---- Known contracts (Sepolia testnet) ---------------------

const KNOWN_CONTRACTS: Record<string, ContractClass> = {
  // Uniswap v2 Sepolia
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': ContractClass.DEX,
  // Uniswap v3 SwapRouter Sepolia
  '0x3bfa4769fb09eefc5a80d6e87c3b9c650f7ae48e': ContractClass.DEX,
  // Aave v3 Pool Sepolia
  '0x6ae43d3271ff6888e7fc43fd7321a503ff738951': ContractClass.LENDING,
  // Aave v3 Pool Sepolia (alt)
  '0x0496275d34753a48320ca58103d5220d394ff77f': ContractClass.LENDING,
  // USDC Sepolia
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': ContractClass.STABLECOIN,
  // WETH Sepolia
  '0xfff9976782d46cc05630d1f6ebab18b2324d6b14': ContractClass.STABLECOIN,
  // Base Sepolia bridge
  '0xfd0bf71f60660e2f608ed56e1659c450eb113120': ContractClass.BRIDGE,
  // Arbitrum Sepolia bridge
  '0x38f918d0e9f1b721edaafe3f4cb43bb5e7ede9cd': ContractClass.BRIDGE,
}

// Known flash loan providers
const FLASH_LOAN_PROVIDERS = new Set([
  '0x6ae43d3271ff6888e7fc43fd7321a503ff738951',
  '0x0496275d34753a48320ca58103d5220d394ff77f',
])

// Whale threshold — 0.5 ETH on testnet
const WHALE_THRESHOLD_WEI = ethers.parseEther('0.5')

// Large approval threshold
const LARGE_APPROVAL_THRESHOLD = ethers.parseUnits('1000000', 6) // 1M USDC

// ERC20 transfer/approve selectors
const ERC20_TRANSFER_SELECTOR  = '0xa9059cbb'
const ERC20_APPROVE_SELECTOR   = '0x095ea7b3'
const FLASH_LOAN_SELECTOR      = '0xab9c4b5d' // flashLoan
const FLASH_LOAN_SIMPLE_SEL    = '0x42b0b77c' // flashLoanSimple

// ---- Block-level MEV analysis ------------------------------

interface BlockAnalysis {
  sandwichAttackers : Set<string>  // txHashes that are sandwich attackers
  sandwichVictims   : Set<string>  // txHashes that are sandwich victims
  flashLoanTxs      : Set<string>  // txHashes with flash loan calls
}

function analyzeBlockForMEV(txs: ethers.TransactionResponse[]): BlockAnalysis {
  const sandwichAttackers = new Set<string>()
  const sandwichVictims   = new Set<string>()
  const flashLoanTxs      = new Set<string>()

  // ---- Flash loan detection --------------------------------
  // A tx calling flashLoan on a known provider
  txs.forEach(tx => {
    if (!tx.to) return
    const toAddr = tx.to.toLowerCase()
    const selector = tx.data?.slice(0, 10)?.toLowerCase()

    if (
      FLASH_LOAN_PROVIDERS.has(toAddr) &&
      (selector === FLASH_LOAN_SELECTOR || selector === FLASH_LOAN_SIMPLE_SEL)
    ) {
      flashLoanTxs.add(tx.hash)
    }
  })

  // ---- Sandwich detection ----------------------------------
  // Group tx indices by sender
  const senderIndices = new Map<string, number[]>()
  txs.forEach((tx, idx) => {
    const sender = tx.from.toLowerCase()
    if (!senderIndices.has(sender)) senderIndices.set(sender, [])
    senderIndices.get(sender)!.push(idx)
  })

  senderIndices.forEach((indices, _sender) => {
    if (indices.length < 2) return

    const first = indices[0]
    const last  = indices[indices.length - 1]

    // Need at least one tx between first and last from a different sender
    if (last - first < 2) return

    // Both attacker txs must interact with same contract (DEX)
    const firstTo = txs[first].to?.toLowerCase()
    const lastTo  = txs[last].to?.toLowerCase()
    if (!firstTo || !lastTo || firstTo !== lastTo) return

    // Check if that contract is a DEX
    const isDex = firstTo in KNOWN_CONTRACTS &&
      KNOWN_CONTRACTS[firstTo] === ContractClass.DEX

    // Even if not in known list, flag if both interact with same contract
    // and there are sandwich-shaped txs between them
    if (isDex || firstTo === lastTo) {
      for (let i = first + 1; i < last; i++) {
        const victimTx = txs[i]
        if (
          victimTx.from.toLowerCase() !== _sender &&
          victimTx.to?.toLowerCase() === firstTo
        ) {
          sandwichAttackers.add(txs[first].hash)
          sandwichAttackers.add(txs[last].hash)
          sandwichVictims.add(victimTx.hash)
        }
      }
    }
  })

  return { sandwichAttackers, sandwichVictims, flashLoanTxs }
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

    const txs = block.prefetchedTransactions
    if (txs.length === 0) return []

    // Run block-level MEV analysis on all txs at once
    const mevAnalysis = analyzeBlockForMEV(txs)

    const records: IntelligenceRecord[] = []
    const BATCH_SIZE = 5

    for (let i = 0; i < txs.length; i += BATCH_SIZE) {
      const batch = txs.slice(i, i + BATCH_SIZE)

      const results = await Promise.all(batch.map(async (tx) => {
        const receipt = await withRetry(
          () => this.provider.getTransactionReceipt(tx.hash),
          `receipt:${tx.hash.slice(0, 10)}`
        )
        if (!receipt) return null

        const status        = this.classifyStatus(receipt.status)
        const failureReason = status !== TxStatus.SUCCESS
          ? await this.detectFailureReason(tx.hash)
          : null
        const contractClass = this.classifyContract(tx.to)
        const riskSignals   = this.generateRiskSignals(
          tx,
          status,
          receipt.gasUsed,
          tx.gasLimit,
          tx.value,
          failureReason,
          mevAnalysis
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
          value         : tx.value,
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

      if (i + BATCH_SIZE < txs.length) {
        const delay = this.config.chainId === ChainId.ARBITRUM ? 300
                    : this.config.chainId === ChainId.BASE      ? 200
                    : 150
        await wait(delay)
      }
    }

    // Log block summary if interesting signals found
    const highRisk = records.filter(r =>
      r.riskSignals.some(s => s.level === RiskLevel.HIGH || s.level === RiskLevel.CRITICAL)
    )
    if (highRisk.length > 0) {
      const signals = highRisk.flatMap(r => r.riskSignals.map(s => s.signalType))
      const unique  = [...new Set(signals)]
      console.log(`[${this.config.name}] Block ${blockNumber} — ${highRisk.length} high-risk txs: ${unique.join(', ')}`)
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
        to   : tx.to ?? undefined,
        from : tx.from,
        data : tx.data,
        value: tx.value,
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
    return KNOWN_CONTRACTS[to.toLowerCase()] ?? ContractClass.UNKNOWN
  }

  private generateRiskSignals(
    tx           : ethers.TransactionResponse,
    status       : TxStatus,
    gasUsed      : bigint,
    gasLimit     : bigint,
    value        : bigint,
    failureReason: string | null,
    mev          : BlockAnalysis
  ): RiskSignal[] {
    const signals: RiskSignal[] = []
    const selector = tx.data?.slice(0, 10)?.toLowerCase()

    // ---- Sandwich attack ------------------------------------
    if (mev.sandwichAttackers.has(tx.hash)) {
      signals.push({
        level      : RiskLevel.CRITICAL,
        reason     : `sandwich attack detected — MEV bot bracketing victim transaction`,
        signalType : SignalType.SANDWICH_ATTACK,
        confidence : 0.88,
      })
    }

    if (mev.sandwichVictims.has(tx.hash)) {
      signals.push({
        level      : RiskLevel.HIGH,
        reason     : `sandwich victim — transaction manipulated by MEV bot`,
        signalType : SignalType.SANDWICH_ATTACK,
        confidence : 0.85,
      })
    }

    // ---- Flash loan -----------------------------------------
    if (mev.flashLoanTxs.has(tx.hash)) {
      signals.push({
        level      : RiskLevel.HIGH,
        reason     : `flash loan detected — large uncollateralised borrow in single block`,
        signalType : SignalType.FLASH_LOAN,
        confidence : 0.95,
      })
    }

    // ---- Whale movement -------------------------------------
    if (value > WHALE_THRESHOLD_WEI) {
      const ethValue = parseFloat(ethers.formatEther(value)).toFixed(3)
      signals.push({
        level      : RiskLevel.HIGH,
        reason     : `whale movement — ${ethValue} ETH transferred`,
        signalType : SignalType.WHALE_MOVEMENT,
        confidence : 1.0,
      })
    }

    // ---- Large ERC20 approval -------------------------------
    if (selector === ERC20_APPROVE_SELECTOR && tx.data.length >= 74) {
      try {
        const amountHex = '0x' + tx.data.slice(74, 138)
        const amount    = BigInt(amountHex)
        if (amount > LARGE_APPROVAL_THRESHOLD) {
          signals.push({
            level      : RiskLevel.MEDIUM,
            reason     : `large token approval — unlimited or very large spend approved`,
            signalType : SignalType.LARGE_APPROVAL,
            confidence : 0.9,
          })
        }
      } catch {}
    }

    // ---- Failed / reverted tx -------------------------------
    if (status === TxStatus.FAILED || status === TxStatus.REVERTED) {
      signals.push({
        level      : RiskLevel.MEDIUM,
        reason     : failureReason ?? 'transaction failed',
        signalType : SignalType.FAILED_TX,
        confidence : 0.95,
      })
    }

    // ---- Gas exhaustion -------------------------------------
    if (gasLimit > 0n) {
      const utilization = Number(gasUsed) / Number(gasLimit)
      if (utilization > 0.95) {
        signals.push({
          level      : RiskLevel.HIGH,
          reason     : `gas exhaustion: ${(utilization * 100).toFixed(1)}% of limit consumed`,
          signalType : SignalType.GAS_EXHAUSTION,
          confidence : 0.9,
        })
      }
    }

    // ---- Out of gas -----------------------------------------
    if (failureReason?.includes('out of gas')) {
      signals.push({
        level      : RiskLevel.HIGH,
        reason     : 'transaction ran out of gas',
        signalType : SignalType.GAS_EXHAUSTION,
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
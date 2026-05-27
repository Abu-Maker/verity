// ============================================================
// Verity — Intelligence API Route
// GET /v1/intelligence
// The core query endpoint. Customers call this to get
// classified transaction intelligence across chains.
// ============================================================

import express, { Router, Request, Response } from 'express'
import { requireApiKey, incrementUsage } from '../middleware/auth'
import { getAllRecords } from '../store/memory'
import { IntelligenceQuerySchema } from '@verity/shared'
import { ChainId, RiskLevel, SignalType } from '@verity/shared'

const router: express.Router = Router()

// ---- GET /v1/intelligence ----------------------------------

router.get('/', requireApiKey, async (req: Request, res: Response) => {
  try {
    const parseResult = IntelligenceQuerySchema.safeParse({
      chainId       : req.query.chainId       ? parseInt(req.query.chainId as string)       : undefined,
      status        : req.query.status,
      contractClass : req.query.contractClass,
      riskLevel     : req.query.riskLevel,
      signalType    : req.query.signalType,
      fromBlock     : req.query.fromBlock     ? parseInt(req.query.fromBlock as string)     : undefined,
      toBlock       : req.query.toBlock       ? parseInt(req.query.toBlock as string)       : undefined,
      limit         : req.query.limit         ? parseInt(req.query.limit as string)         : 50,
      offset        : req.query.offset        ? parseInt(req.query.offset as string)        : 0,
    })

    if (!parseResult.success) {
      res.status(400).json({
        error  : 'invalid_params',
        issues : parseResult.error.issues,
      })
      return
    }

    const query  = parseResult.data
    const apiKey = req.apiKey!

    const chainsToQuery: ChainId[] = query.chainId
      ? [query.chainId]
      : apiKey.chains

    let allRecords = getAllRecords(chainsToQuery)

    if (query.status) {
      allRecords = allRecords.filter(r => r.status === query.status)
    }

    if (query.contractClass) {
      allRecords = allRecords.filter(r => r.contractClass === query.contractClass)
    }

    if (query.riskLevel) {
      allRecords = allRecords.filter(r =>
        r.riskSignals.some(s => s.level === query.riskLevel)
      )
    }

    if (query.signalType) {
      allRecords = allRecords.filter(r =>
        r.riskSignals.some(s => s.signalType === query.signalType)
      )
    }

    if (query.fromBlock) {
      allRecords = allRecords.filter(r => r.blockNumber >= query.fromBlock!)
    }

    if (query.toBlock) {
      allRecords = allRecords.filter(r => r.blockNumber <= query.toBlock!)
    }

    allRecords.sort((a, b) => b.timestamp - a.timestamp)

    const total   = allRecords.length
    const records = allRecords.slice(query.offset, query.offset + query.limit)

    incrementUsage(apiKey.key)

    res.status(200).json({
      success : true,
      meta    : {
        total,
        limit      : query.limit,
        offset     : query.offset,
        returned   : records.length,
        chains     : chainsToQuery,
        tier       : apiKey.tier,
        usage      : {
          used  : apiKey.queriesUsed,
          limit : apiKey.queryLimit,
        },
        // Signal summary — useful for exchange dashboards
        signalSummary: {
          sandwich_attacks : records.filter(r => r.riskSignals.some(s => s.signalType === SignalType.SANDWICH_ATTACK)).length,
          flash_loans      : records.filter(r => r.riskSignals.some(s => s.signalType === SignalType.FLASH_LOAN)).length,
          whale_movements  : records.filter(r => r.riskSignals.some(s => s.signalType === SignalType.WHALE_MOVEMENT)).length,
          failed_txs       : records.filter(r => r.riskSignals.some(s => s.signalType === SignalType.FAILED_TX)).length,
          gas_exhaustion   : records.filter(r => r.riskSignals.some(s => s.signalType === SignalType.GAS_EXHAUSTION)).length,
          large_approvals  : records.filter(r => r.riskSignals.some(s => s.signalType === SignalType.LARGE_APPROVAL)).length,
        },
      },
      data: records,
    })

  } catch (err) {
    console.error('[Verity API] /v1/intelligence error:', err)
    res.status(500).json({
      error  : 'internal_error',
      message: 'Something went wrong. Please try again.',
    })
  }
})

// ---- GET /v1/intelligence/:txHash -------------------------

router.get('/:txHash', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params
    const apiKey     = req.apiKey!

    const allRecords = getAllRecords(apiKey.chains)
    const record     = allRecords.find(r => r.txHash === txHash)

    if (!record) {
      res.status(404).json({
        error  : 'not_found',
        message: `No intelligence record found for tx ${txHash}`,
      })
      return
    }

    incrementUsage(apiKey.key)

    res.status(200).json({
      success: true,
      data   : record,
    })

  } catch (err) {
    console.error('[Verity API] /v1/intelligence/:txHash error:', err)
    res.status(500).json({
      error  : 'internal_error',
      message: 'Something went wrong. Please try again.',
    })
  }
})

// ---- GET /v1/intelligence/wallet/:address -----------------
// Exchange-grade: risk score for a specific wallet

router.get('/wallet/:address', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { address } = req.params
    const apiKey      = req.apiKey!

    if (!/^0x[a-fA-F0-9]{40}$/.test(address as string)) {
      res.status(400).json({ error: 'invalid_address' })
      return
    }

    const allRecords = getAllRecords(apiKey.chains)
    const walletTxs  = allRecords.filter(r =>
      r.from.toLowerCase() === (address as string).toLowerCase() ||
      r.to?.toLowerCase()  === (address as string).toLowerCase()
    )

    if (walletTxs.length === 0) {
      res.status(200).json({
        success    : true,
        address,
        riskScore  : 0,
        riskLevel  : 'unknown',
        txCount    : 0,
        signals    : {},
        records    : [],
      })
      return
    }

    // Count signals
    const signalCounts: Record<string, number> = {}
    walletTxs.forEach(r => {
      r.riskSignals.forEach(s => {
        signalCounts[s.signalType] = (signalCounts[s.signalType] ?? 0) + 1
      })
    })

    // Score: sandwich=40pts, flash_loan=30pts, whale=20pts, failed=5pts each
    const score = Math.min(100,
      (signalCounts[SignalType.SANDWICH_ATTACK] ?? 0) * 40 +
      (signalCounts[SignalType.FLASH_LOAN]      ?? 0) * 30 +
      (signalCounts[SignalType.WHALE_MOVEMENT]  ?? 0) * 20 +
      (signalCounts[SignalType.LARGE_APPROVAL]  ?? 0) * 10 +
      (signalCounts[SignalType.FAILED_TX]       ?? 0) * 5
    )

    const riskLevel = score >= 70 ? 'critical'
                    : score >= 40 ? 'high'
                    : score >= 20 ? 'medium'
                    : score > 0   ? 'low'
                    : 'clean'

    incrementUsage(apiKey.key)

    res.status(200).json({
      success   : true,
      address,
      riskScore : score,
      riskLevel,
      txCount   : walletTxs.length,
      signals   : signalCounts,
      records   : walletTxs.slice(0, 10),
    })

  } catch (err) {
    console.error('[Verity API] /v1/intelligence/wallet/:address error:', err)
    res.status(500).json({
      error  : 'internal_error',
      message: 'Something went wrong. Please try again.',
    })
  }
})

export default router
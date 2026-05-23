// ============================================================
// Verity — Intelligence API Route
// GET /v1/intelligence
// The core query endpoint. Customers call this to get
// classified transaction intelligence across chains.
// ============================================================

import express, { Router, Request, Response } from 'express'
import { requireApiKey, incrementUsage } from '../middleware/auth'
import { loadRecords } from '../../scanner/storage/state'
import { IntelligenceQuerySchema } from '@verity/shared'
import { ChainId, RiskLevel } from '@verity/shared'

const router: express.Router = Router()

// ---- GET /v1/intelligence ----------------------------------

router.get('/', requireApiKey, async (req: Request, res: Response) => {
  try {
    // Parse and validate query params
    const parseResult = IntelligenceQuerySchema.safeParse({
      chainId       : req.query.chainId       ? parseInt(req.query.chainId as string)       : undefined,
      status        : req.query.status,
      contractClass : req.query.contractClass,
      riskLevel     : req.query.riskLevel,
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
    const today  = new Date().toISOString().split('T')[0]

    // Determine which chains to query
    const chainsToQuery: ChainId[] = query.chainId
      ? [query.chainId]
      : apiKey.chains

    // Load records from all requested chains
    let allRecords = (
      await Promise.all(
        chainsToQuery.map(chainId => loadRecords(chainId, today))
      )
    ).flat()

    // Apply filters
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

    if (query.fromBlock) {
      allRecords = allRecords.filter(r => r.blockNumber >= query.fromBlock!)
    }

    if (query.toBlock) {
      allRecords = allRecords.filter(r => r.blockNumber <= query.toBlock!)
    }

    // Sort by timestamp descending — newest first
    allRecords.sort((a, b) => b.timestamp - a.timestamp)

    // Paginate
    const total   = allRecords.length
    const records = allRecords.slice(query.offset, query.offset + query.limit)

    // Meter usage
    incrementUsage(apiKey.key)

    // Respond
    res.status(200).json({
      success : true,
      meta    : {
        total,
        limit   : query.limit,
        offset  : query.offset,
        returned: records.length,
        chains  : chainsToQuery,
        tier    : apiKey.tier,
        usage   : {
          used  : apiKey.queriesUsed,
          limit : apiKey.queryLimit,
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
    const today      = new Date().toISOString().split('T')[0]

    // Search across all chains the key has access to
    const allRecords = (
      await Promise.all(
        apiKey.chains.map(chainId => loadRecords(chainId, today))
      )
    ).flat()

    const record = allRecords.find(r => r.txHash === txHash)

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

export default router
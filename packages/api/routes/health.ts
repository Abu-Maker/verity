// ============================================================
// Verity — Health Route
// GET /health
// Shows live status of the API and all configured chains.
// Useful for monitoring, Railway health checks, and customers
// who want to verify the service is up before querying.
// ============================================================

import { Router, Request, Response } from 'express'
import express from 'express'
import { ethers } from 'ethers'
import { ChainId, ChainName } from '@verity/shared'
import { getChainConfig } from '../../scanner/adapters/evm/adapter'

const router: express.Router = Router()

// ---- Chain health check ------------------------------------

async function checkChain(chainId: ChainId): Promise<{
  name      : ChainName
  chainId   : ChainId
  status    : 'healthy' | 'degraded' | 'down'
  latencyMs : number
  blockNumber?: number
}> {
  const config   = getChainConfig(chainId)
  const provider = new ethers.JsonRpcProvider(config.rpcUrl)
  const start    = Date.now()

  try {
    const blockNumber = await provider.getBlockNumber()
    const latencyMs   = Date.now() - start

    return {
      name       : config.name,
      chainId,
      status     : latencyMs < 2000 ? 'healthy' : 'degraded',
      latencyMs,
      blockNumber,
    }
  } catch {
    return {
      name      : config.name,
      chainId,
      status    : 'down',
      latencyMs : Date.now() - start,
    }
  }
}

// ---- GET /health -------------------------------------------

router.get('/', async (_req: Request, res: Response) => {
  const start = Date.now()
  console.log('[Health] ETH_RPC_URL:', process.env.ETH_RPC_URL ? 'SET' : 'NOT SET')

  try {
    // Check all Tier 1 chains in parallel
    const [ethereum, base, arbitrum] = await Promise.all([
      checkChain(ChainId.ETHEREUM),
      checkChain(ChainId.BASE),
      checkChain(ChainId.ARBITRUM),
    ])

    const chains  = [ethereum, base, arbitrum]
    const healthy = chains.every(c => c.status === 'healthy')
    const degraded= chains.some(c => c.status === 'degraded')

    const overallStatus = healthy
      ? 'healthy'
      : degraded
        ? 'degraded'
        : 'down'

    res.status(200).json({
      status     : overallStatus,
      service    : 'verity-api',
      version    : '1.0.0',
      timestamp  : Date.now(),
      uptimeMs   : process.uptime() * 1000,
      responseMs : Date.now() - start,
      chains,
    })

  } catch (err) {
    res.status(500).json({
      status    : 'down',
      service   : 'verity-api',
      timestamp : Date.now(),
      error     : 'Health check failed',
    })
  }
})

export default router
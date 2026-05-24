// ============================================================
// Verity — API Key Authentication Middleware
// Every request hits this before reaching any route.
// Validates the key, checks the tier, enforces chain access.
// ============================================================

import { Request, Response, NextFunction } from 'express'
import { ApiKey, ChainId } from '@verity/shared'

// ---- Extend Express Request --------------------------------

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey
    }
  }
}

// ---- In-memory key store -----------------------------------
// Phase 1: hardcoded keys for development and testing.
// Phase 2: swap this for a database lookup.

const API_KEYS: Record<string, ApiKey> = {
  'vrt_free_test_key_32chars_xxxxxxxx': {
    key         : 'vrt_free_test_key_32chars_xxxxxxxx',
    ownerId     : 'owner-001',
    tier        : 'free',
    queriesUsed : 0,
    queryLimit  : 1000,       // Free — $0 — resets every 30 days
    chains      : [ChainId.ETHEREUM],
    createdAt   : Date.now(),
  },
  'vrt_builder_test_key_32chars_xxxxx': {
    key         : 'vrt_builder_test_key_32chars_xxxxx',
    ownerId     : 'owner-002',
    tier        : 'builder',
    queriesUsed : 0,
    queryLimit  : 10000,      // Builder — $35/mo — resets every 30 days
    chains      : [ChainId.ETHEREUM, ChainId.BASE, ChainId.ARBITRUM],
    createdAt   : Date.now(),
  },
  'vrt_pro_test_key_32chars_xxxxxxxxx': {
    key         : 'vrt_pro_test_key_32chars_xxxxxxxxx',
    ownerId     : 'owner-003',
    tier        : 'pro',
    queriesUsed : 0,
    queryLimit  : 50000,     // Pro — $75/mo — resets every 30 days
    chains      : [ChainId.ETHEREUM, ChainId.BASE, ChainId.ARBITRUM],
    createdAt   : Date.now(),
  },
}

// ---- Middleware ---------------------------------------------

export function requireApiKey(
  req : Request,
  res : Response,
  next: NextFunction
): void {
  // Accept key from header or query param
  const key =
    (req.headers['x-api-key'] as string) ??
    (req.query['api_key'] as string)

  if (!key) {
    res.status(401).json({
      error  : 'missing_api_key',
      message: 'Provide your Verity API key via the x-api-key header',
    })
    return
  }

  const apiKey = API_KEYS[key]

  if (!apiKey) {
    res.status(401).json({
      error  : 'invalid_api_key',
      message: 'API key not recognised',
    })
    return
  }

  // Check query limit
  if (apiKey.queriesUsed >= apiKey.queryLimit) {
    res.status(429).json({
      error  : 'quota_exceeded',
      message: `You have used all ${apiKey.queryLimit} queries on the ${apiKey.tier} plan`,
      upgrade: 'https://verity.xyz/pricing',
    })
    return
  }

  // Attach to request for downstream use
  req.apiKey = apiKey
  next()
}

// ---- Chain access check ------------------------------------

export function requireChainAccess(chainId: ChainId) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.apiKey

    if (!apiKey) {
      res.status(401).json({ error: 'unauthorised' })
      return
    }

    if (!apiKey.chains.includes(chainId)) {
      res.status(403).json({
        error  : 'chain_not_included',
        message: `Your ${apiKey.tier} plan does not include ${ChainId[chainId]} access`,
        upgrade: 'https://verity.xyz/pricing',
      })
      return
    }

    next()
  }
}

// ---- Usage increment ---------------------------------------
// Call this after a successful query to meter usage.

export function incrementUsage(key: string): void {
  if (API_KEYS[key]) {
    API_KEYS[key].queriesUsed += 1
  }
}
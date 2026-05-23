// ============================================================
// Verity — Rate Limiting Middleware
// Enforces per-key request rate limits by tier.
// Phase 1: in-memory sliding window.
// Phase 2: swap window store for Redis.
// ============================================================

import { Request, Response, NextFunction } from 'express'
import { ApiKey } from '@verity/shared'

// ---- Rate limits by tier -----------------------------------

const TIER_LIMITS: Record<ApiKey['tier'], { requests: number; windowMs: number }> = {
  free      : { requests: 10,   windowMs: 60_000 },   // 10  req/min
  builder   : { requests: 60,   windowMs: 60_000 },   // 60  req/min
  pro       : { requests: 300,  windowMs: 60_000 },   // 300 req/min
  enterprise: { requests: 1000, windowMs: 60_000 },   // 1000 req/min
}

// ---- Sliding window store ----------------------------------
// key → array of request timestamps

const windowStore = new Map<string, number[]>()

function getWindow(key: string): number[] {
  if (!windowStore.has(key)) windowStore.set(key, [])
  return windowStore.get(key)!
}

function cleanWindow(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs
  return timestamps.filter(t => t > cutoff)
}

// ---- Middleware ---------------------------------------------

export function rateLimit(
  req : Request,
  res : Response,
  next: NextFunction
): void {
  const apiKey = req.apiKey

  if (!apiKey) {
    next()
    return
  }

  const limit      = TIER_LIMITS[apiKey.tier]
  const now        = Date.now()
  const timestamps = cleanWindow(getWindow(apiKey.key), limit.windowMs)

  if (timestamps.length >= limit.requests) {
    const retryAfterMs = limit.windowMs - (now - timestamps[0])
    const retryAfterS  = Math.ceil(retryAfterMs / 1000)

    res.setHeader('Retry-After', String(retryAfterS))
    res.setHeader('X-RateLimit-Limit',     String(limit.requests))
    res.setHeader('X-RateLimit-Remaining', '0')
    res.setHeader('X-RateLimit-Reset',     String(timestamps[0] + limit.windowMs))

    res.status(429).json({
      error      : 'rate_limit_exceeded',
      message    : `Too many requests. ${limit.requests} requests allowed per minute on the ${apiKey.tier} plan`,
      retryAfter : retryAfterS,
      upgrade    : 'https://verity.xyz/pricing',
    })
    return
  }

  // Record this request
  timestamps.push(now)
  windowStore.set(apiKey.key, timestamps)

  // Set rate limit headers on every response
  res.setHeader('X-RateLimit-Limit',     String(limit.requests))
  res.setHeader('X-RateLimit-Remaining', String(limit.requests - timestamps.length))
  res.setHeader('X-RateLimit-Reset',     String(now + limit.windowMs))

  next()
}
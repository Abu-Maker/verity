// ============================================================
// Verity — In-Memory Record Store
// Scanner POSTs records here. Intelligence route reads from here.
// Phase 2: swap for Redis/Postgres.
// ============================================================
import { IntelligenceRecord, ChainId } from '@verity/shared'

// Simple in-memory store keyed by chainId
const store = new Map<ChainId, IntelligenceRecord[]>()

// Max records per chain to prevent unbounded growth
const MAX_RECORDS_PER_CHAIN = 50_000

export function pushRecords(chainId: ChainId, records: IntelligenceRecord[]): void {
  if (!store.has(chainId)) store.set(chainId, [])
  const existing = store.get(chainId)!
  existing.push(...records)
  // Trim oldest records if over limit
  if (existing.length > MAX_RECORDS_PER_CHAIN) {
    existing.splice(0, existing.length - MAX_RECORDS_PER_CHAIN)
  }
}

export function getRecords(chainId: ChainId): IntelligenceRecord[] {
  return store.get(chainId) ?? []
}

export function getAllRecords(chainIds: ChainId[]): IntelligenceRecord[] {
  return chainIds.flatMap(id => store.get(id) ?? [])
}

export function getStoreStats(): Record<number, number> {
  const stats: Record<number, number> = {}
  store.forEach((records, chainId) => { stats[chainId] = records.length })
  return stats
}
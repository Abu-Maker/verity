// ============================================================
// Verity — Intelligence Feed Component
// ============================================================

import { IntelligenceRecord } from '../pages/Dashboard'

interface Props {
  records : IntelligenceRecord[]
  loading : boolean
}

const STATUS_COLORS: Record<string, string> = {
  success : '#a3e635',
  failed  : '#ff4444',
  reverted: '#f5c842',
  pending : '#7a8a7a',
}

const RISK_COLORS: Record<string, string> = {
  low     : '#7a8a7a',
  medium  : '#f5c842',
  high    : '#ff8c00',
  critical: '#ff4444',
}

const CHAIN_NAMES: Record<number, string> = {
  1    : 'Ethereum',
  8453 : 'Base',
  42161: 'Arbitrum',
}

function shortHash(hash: string) {
  return hash.slice(0, 6) + '...' + hash.slice(-4)
}

function shortAddr(addr: string | null) {
  if (!addr) return '—'
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

export default function IntelligenceFeed({ records, loading }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.label}>LIVE INTELLIGENCE FEED</span>
        <span style={styles.count}>
          {records.length} records
        </span>
      </div>

      {loading && records.length === 0 ? (
        <div style={styles.skeletons}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ ...styles.skeleton, opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>◈</span>
          <p style={styles.emptyTitle}>No records yet</p>
          <p style={styles.emptyHint}>
            Start the scanner worker to begin ingesting blocks
          </p>
        </div>
      ) : (
        <div style={styles.table}>
          {/* Table header */}
          <div style={styles.tableHeader}>
            {['Chain', 'Tx Hash', 'From', 'Status', 'Risk', 'Class', 'Block', 'Time'].map(h => (
              <span key={h} style={styles.th}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {records.map(record => {
            const topRisk = record.riskSignals.sort((a, b) => {
              const order = ['critical', 'high', 'medium', 'low']
              return order.indexOf(a.level) - order.indexOf(b.level)
            })[0]

            return (
              <div key={record.id} style={styles.row}>
                <span style={styles.chain}>
                  {CHAIN_NAMES[record.chainId] ?? record.chainName}
                </span>
                <span style={styles.hash}>
                  {shortHash(record.txHash)}
                </span>
                <span style={styles.addr}>
                  {shortAddr(record.from)}
                </span>
                <span style={{
                  ...styles.status,
                  color: STATUS_COLORS[record.status] ?? '#7a8a7a',
                }}>
                  {record.status}
                </span>
                <span style={{
                  ...styles.risk,
                  color: topRisk ? RISK_COLORS[topRisk.level] : '#4a5a4a',
                }}>
                  {topRisk ? topRisk.level : '—'}
                </span>
                <span style={styles.cls}>
                  {record.contractClass}
                </span>
                <span style={styles.block}>
                  {record.blockNumber.toLocaleString()}
                </span>
                <span style={styles.time}>
                  {timeAgo(record.timestamp)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const cell: React.CSSProperties = {
  fontFamily  : "'Space Mono', monospace",
  fontSize    : '12px',
  overflow    : 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace  : 'nowrap' as const,
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background   : '#0d140d',
    border       : '1px solid #1e2e1e',
    borderRadius : '12px',
    padding      : '20px',
    display      : 'flex',
    flexDirection: 'column',
    gap          : '16px',
    flex         : 1,
  },
  header: {
    display       : 'flex',
    justifyContent: 'space-between',
    alignItems    : 'center',
  },
  label: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '10px',
    letterSpacing: '0.15em',
    color        : '#4a5a4a',
  },
  count: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '11px',
    color        : '#7a8a7a',
  },
  table: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '2px',
  },
  tableHeader: {
    display            : 'grid',
    gridTemplateColumns: '100px 90px 90px 80px 70px 90px 90px 70px',
    gap                : '8px',
    padding            : '8px 12px',
    borderBottom       : '1px solid #1e2e1e',
    marginBottom       : '4px',
  },
  th: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '10px',
    letterSpacing: '0.12em',
    color        : '#4a5a4a',
  },
  row: {
    display            : 'grid',
    gridTemplateColumns: '100px 90px 90px 80px 70px 90px 90px 70px',
    gap                : '8px',
    padding            : '10px 12px',
    borderRadius       : '6px',
    transition         : 'background 0.15s',
    cursor             : 'default',
  },
  chain : { ...cell, color: '#a3e635' },
  hash  : { ...cell, color: '#ffffff' },
  addr  : { ...cell, color: '#7a8a7a' },
  status: { ...cell, fontWeight: 700 },
  risk  : { ...cell, fontWeight: 700, textTransform: 'capitalize' as const },
  cls   : { ...cell, color: '#7a8a7a', textTransform: 'capitalize' as const },
  block : { ...cell, color: '#4a5a4a' },
  time  : { ...cell, color: '#4a5a4a' },
  empty: {
    display       : 'flex',
    flexDirection : 'column',
    alignItems    : 'center',
    justifyContent: 'center',
    padding       : '60px',
    gap           : '12px',
  },
  emptyIcon: {
    fontSize: '36px',
    color   : '#1e2e1e',
  },
  emptyTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize  : '16px',
    fontWeight: 700,
    color     : '#4a5a4a',
  },
  emptyHint: {
    fontFamily: "'Space Mono', monospace",
    fontSize  : '12px',
    color     : '#2a3a2a',
    textAlign : 'center' as const,
  },
  skeletons: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '8px',
  },
  skeleton: {
    height      : '44px',
    background  : '#131f13',
    borderRadius: '6px',
  },
}
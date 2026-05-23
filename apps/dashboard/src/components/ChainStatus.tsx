// ============================================================
// Verity — Chain Status Component
// ============================================================

import { HealthData } from '../pages/Dashboard'

interface Props {
  health  : HealthData | null
  loading : boolean
}

const CHAIN_ICONS: Record<string, string> = {
  ethereum : 'Ξ',
  base     : '⬡',
  arbitrum : '◈',
}

export default function ChainStatus({ health, loading }: Props) {
  if (loading && !health) {
    return (
      <div style={styles.card}>
        <span style={styles.label}>CHAIN STATUS</span>
        <div style={styles.skeletonRow}>
          {[1, 2, 3].map(i => (
            <div key={i} style={styles.skeleton} />
          ))}
        </div>
      </div>
    )
  }

  if (!health) {
    return (
      <div style={styles.card}>
        <span style={styles.label}>CHAIN STATUS</span>
        <p style={styles.offline}>API offline — start the API server locally</p>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.label}>CHAIN STATUS</span>
        <span style={{
          ...styles.overall,
          color: health.status === 'healthy' ? '#a3e635' : '#ff4444',
        }}>
          ● {health.status.toUpperCase()}
        </span>
      </div>

      <div style={styles.chains}>
        {health.chains.map(chain => (
          <div key={chain.chainId} style={styles.chainCard}>
            <div style={styles.chainTop}>
              <span style={styles.chainIcon}>
                {CHAIN_ICONS[chain.name] ?? '◉'}
              </span>
              <span style={styles.chainName}>{chain.name}</span>
              <span style={{
                ...styles.statusDot,
                background: chain.status === 'healthy'
                  ? '#a3e635'
                  : chain.status === 'degraded'
                    ? '#f5c842'
                    : '#ff4444',
                boxShadow: chain.status === 'healthy'
                  ? '0 0 6px #a3e63566'
                  : 'none',
              }} />
            </div>

            {chain.blockNumber && (
              <div style={styles.blockNum}>
                Block {chain.blockNumber.toLocaleString()}
              </div>
            )}

            <div style={styles.latency}>
              {chain.latencyMs}ms
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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
  overall: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '11px',
    fontWeight   : 700,
    letterSpacing: '0.1em',
  },
  chains: {
    display            : 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap                : '12px',
  },
  chainCard: {
    background   : '#131f13',
    border       : '1px solid #1e2e1e',
    borderRadius : '8px',
    padding      : '16px',
    display      : 'flex',
    flexDirection: 'column',
    gap          : '8px',
  },
  chainTop: {
    display    : 'flex',
    alignItems : 'center',
    gap        : '8px',
  },
  chainIcon: {
    color      : '#a3e635',
    fontSize   : '18px',
  },
  chainName: {
    fontFamily : "'Syne', sans-serif",
    fontSize   : '14px',
    fontWeight : 700,
    color      : '#ffffff',
    flex       : 1,
    textTransform: 'capitalize' as const,
  },
  statusDot: {
    width        : '8px',
    height       : '8px',
    borderRadius : '50%',
    flexShrink   : 0,
  },
  blockNum: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '11px',
    color      : '#7a8a7a',
  },
  latency: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '13px',
    color      : '#a3e635',
    fontWeight : 700,
  },
  skeletonRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap    : '12px',
  },
  skeleton: {
    height      : '100px',
    background  : '#131f13',
    borderRadius: '8px',
    animation   : 'pulse-glow 1.5s ease infinite',
  },
  offline: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '12px',
    color      : '#4a5a4a',
  },
}
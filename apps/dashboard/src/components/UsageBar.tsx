// ============================================================
// Verity — Usage Bar Component
// ============================================================

interface Props {
  used  : number
  limit : number
  tier  : string
}

const TIER_PRICES: Record<string, string> = {
  free      : '$0/mo',
  builder   : '$35/mo',
  pro       : '$75/mo',
  enterprise: 'Custom',
}

export default function UsageBar({ used, limit, tier }: Props) {
  const pct     = Math.min((used / limit) * 100, 100)
  const remaining = limit - used

  const barColor = pct >= 90
    ? '#ff4444'
    : pct >= 70
      ? '#f5c842'
      : '#a3e635'

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.label}>QUERY USAGE</span>
        <span style={styles.price}>{TIER_PRICES[tier] ?? ''}</span>
      </div>

      <div style={styles.counts}>
        <span style={styles.used}>{used.toLocaleString()}</span>
        <span style={styles.slash}>/</span>
        <span style={styles.limit}>{limit.toLocaleString()}</span>
        <span style={styles.unit}>queries</span>
      </div>

      {/* Bar */}
      <div style={styles.track}>
        <div style={{
          ...styles.bar,
          width     : `${pct}%`,
          background: barColor,
          boxShadow : `0 0 8px ${barColor}66`,
        }} />
      </div>

      <div style={styles.footer}>
        <span style={{ ...styles.footerText, color: barColor }}>
          {pct.toFixed(1)}% used
        </span>
        <span style={styles.footerText}>
          {remaining.toLocaleString()} remaining · resets in 30 days
        </span>
      </div>

      {pct >= 80 && (
        <a href="https://verity.xyz/pricing" style={styles.upgrade}>
          Upgrade plan →
        </a>
      )}
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
    gap          : '12px',
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
  price: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '11px',
    color        : '#7a8a7a',
  },
  counts: {
    display    : 'flex',
    alignItems : 'baseline',
    gap        : '6px',
  },
  used: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '32px',
    fontWeight : 700,
    color      : '#ffffff',
  },
  slash: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '20px',
    color      : '#4a5a4a',
  },
  limit: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '20px',
    color      : '#7a8a7a',
  },
  unit: {
    fontFamily : "'Syne', sans-serif",
    fontSize   : '13px',
    color      : '#4a5a4a',
    marginLeft : '4px',
  },
  track: {
    height      : '6px',
    background  : '#1e2e1e',
    borderRadius: '100px',
    overflow    : 'hidden',
  },
  bar: {
    height      : '100%',
    borderRadius: '100px',
    transition  : 'width 0.6s ease',
  },
  footer: {
    display       : 'flex',
    justifyContent: 'space-between',
  },
  footerText: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '11px',
    color      : '#4a5a4a',
  },
  upgrade: {
    fontFamily  : "'Syne', sans-serif",
    fontSize    : '13px',
    fontWeight  : 700,
    color       : '#050805',
    background  : '#a3e635',
    borderRadius: '6px',
    padding     : '8px 16px',
    textAlign   : 'center' as const,
    textDecoration: 'none',
    display     : 'block',
  },
}
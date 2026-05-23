// ============================================================
// Verity — API Key Card Component
// ============================================================

import { useState } from 'react'

interface Props {
  apiKey : string
  tier   : string
}

const TIER_COLORS: Record<string, string> = {
  free      : '#7a8a7a',
  builder   : '#a3e635',
  pro       : '#f5c842',
  enterprise: '#60a5fa',
}

export default function ApiKeyCard({ apiKey, tier }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const masked = apiKey
    ? apiKey.slice(0, 8) + '••••••••••••••••' + apiKey.slice(-4)
    : 'No key loaded'

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.label}>API KEY</span>
        <span style={{
          ...styles.tier,
          color          : TIER_COLORS[tier] ?? '#7a8a7a',
          borderColor    : TIER_COLORS[tier] ?? '#7a8a7a',
          backgroundColor: `${TIER_COLORS[tier] ?? '#7a8a7a'}18`,
        }}>
          {tier.toUpperCase()}
        </span>
      </div>

      <div style={styles.keyRow}>
        <span style={styles.key}>{masked}</span>
        <button onClick={copy} style={styles.copyBtn}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <p style={styles.hint}>
        Pass via <code style={styles.code}>x-api-key</code> header on every request
      </p>
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
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
  },
  label: {
    fontFamily  : "'Space Mono', monospace",
    fontSize    : '10px',
    letterSpacing: '0.15em',
    color       : '#4a5a4a',
  },
  tier: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '10px',
    letterSpacing: '0.12em',
    padding      : '3px 10px',
    borderRadius : '100px',
    border       : '1px solid',
    fontWeight   : 700,
  },
  keyRow: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
    background     : '#131f13',
    border         : '1px solid #1e2e1e',
    borderRadius   : '8px',
    padding        : '12px 16px',
  },
  key: {
    fontFamily  : "'Space Mono', monospace",
    fontSize    : '12px',
    color       : '#ffffff',
    letterSpacing: '0.05em',
  },
  copyBtn: {
    fontFamily  : "'Space Mono', monospace",
    fontSize    : '11px',
    color       : '#a3e635',
    background  : 'transparent',
    border      : 'none',
    cursor      : 'pointer',
    padding     : '4px 8px',
    flexShrink  : 0,
  },
  hint: {
    fontFamily  : "'Syne', sans-serif",
    fontSize    : '12px',
    color       : '#4a5a4a',
  },
  code: {
    fontFamily  : "'Space Mono', monospace",
    fontSize    : '11px',
    color       : '#7a8a7a',
    background  : '#131f13',
    padding     : '1px 6px',
    borderRadius: '4px',
  },
}
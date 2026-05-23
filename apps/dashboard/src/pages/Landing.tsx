// ============================================================
// Verity — Landing Page
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SESSION_KEY = 'verity_entered'

const TICKER_ITEMS = [
  'Real-time onchain intelligence',
  'Ethereum · Base · Arbitrum',
  'Failing transaction detection',
  'Contract behavior classification',
  'Pay-per-query via USDC',
  'Autonomous agent powered',
]

export default function Landing() {
  const navigate    = useNavigate()
  const [key, setKey] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleEnter() {
    if (!key.trim()) {
      setError('Enter your API key to continue')
      return
    }
    setLoading(true)
    setError('')

    // Store key and mark as entered
    sessionStorage.setItem(SESSION_KEY, 'true')
    sessionStorage.setItem('verity_api_key', key.trim())

    setTimeout(() => {
      navigate('/dashboard')
    }, 600)
  }

  const tickerText = TICKER_ITEMS.join('   //   ')

  return (
    <div style={styles.root}>

      {/* Background grid */}
      <div style={styles.grid} />

      {/* Glow */}
      <div style={styles.glow} />

      {/* Nav */}
      <nav style={styles.nav}>
        <span style={styles.logo}>VERITY</span>
        <a
          href="https://github.com/Abu-Maker/verity"
          target="_blank"
          rel="noreferrer"
          style={styles.navLink}
        >
          GitHub ↗
        </a>
      </nav>

      {/* Hero */}
      <main style={styles.main}>
        <div className="animate-fade-up" style={styles.badge}>
          INTELLIGENCE INFRASTRUCTURE · LIVE
        </div>

        <h1 className="animate-fade-up delay-1" style={styles.h1}>
          Onchain Intelligence<br />
          <span style={styles.h1Accent}>Across Every Chain</span>
        </h1>

        <p className="animate-fade-up delay-2" style={styles.sub}>
          Scan every live block. Detect failing transactions.<br />
          Classify contract behavior. Query via API or autonomous agent.
        </p>

        {/* Key input */}
        <div className="animate-fade-up delay-3" style={styles.inputRow}>
          <input
            type="text"
            placeholder="Enter your API key — vrt_..."
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEnter()}
            style={styles.input}
          />
          <button
            onClick={handleEnter}
            disabled={loading}
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Entering...' : 'Launch Dashboard →'}
          </button>
        </div>

        {error && (
          <p style={styles.error}>{error}</p>
        )}

        <p className="animate-fade-up delay-4" style={styles.hint}>
          No key?{' '}
          <a href="mailto:hello@verity.xyz" style={styles.hintLink}>
            Request early access
          </a>
        </p>

        {/* Stats */}
        <div className="animate-fade-up delay-4" style={styles.stats}>
          {[
            { label: 'Chains', value: '3' },
            { label: 'Scan interval', value: '~2s' },
            { label: 'Query cost', value: '$0.002' },
            { label: 'Agent cycle', value: '5 min' },
          ].map(s => (
            <div key={s.label} style={styles.stat}>
              <span style={styles.statValue}>{s.value}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Ticker */}
      <div style={styles.ticker}>
        <div style={styles.tickerTrack}>
          {[tickerText, tickerText].map((t, i) => (
            <span key={i} style={styles.tickerText}>{t}&nbsp;&nbsp;&nbsp;//&nbsp;&nbsp;&nbsp;</span>
          ))}
        </div>
      </div>

    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight       : '100vh',
    background      : '#050805',
    display         : 'flex',
    flexDirection   : 'column',
    position        : 'relative',
    overflow        : 'hidden',
  },
  grid: {
    position        : 'absolute',
    inset           : 0,
    backgroundImage : `
      linear-gradient(rgba(163,230,53,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(163,230,53,0.04) 1px, transparent 1px)
    `,
    backgroundSize  : '48px 48px',
    pointerEvents   : 'none',
  },
  glow: {
    position        : 'absolute',
    top             : '-20%',
    left            : '50%',
    transform       : 'translateX(-50%)',
    width           : '600px',
    height          : '600px',
    borderRadius    : '50%',
    background      : 'radial-gradient(circle, rgba(163,230,53,0.08) 0%, transparent 70%)',
    pointerEvents   : 'none',
  },
  nav: {
    display         : 'flex',
    justifyContent  : 'space-between',
    alignItems      : 'center',
    padding         : '24px 48px',
    position        : 'relative',
    zIndex          : 10,
  },
  logo: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '20px',
    fontWeight      : 700,
    color           : '#a3e635',
    letterSpacing   : '0.15em',
  },
  navLink: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '13px',
    color           : '#7a8a7a',
    textDecoration  : 'none',
    transition      : 'color 0.2s',
  },
  main: {
    flex            : 1,
    display         : 'flex',
    flexDirection   : 'column',
    alignItems      : 'center',
    justifyContent  : 'center',
    textAlign       : 'center',
    padding         : '60px 24px',
    position        : 'relative',
    zIndex          : 10,
  },
  badge: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '11px',
    letterSpacing   : '0.2em',
    color           : '#a3e635',
    background      : 'rgba(163,230,53,0.08)',
    border          : '1px solid rgba(163,230,53,0.2)',
    borderRadius    : '100px',
    padding         : '6px 16px',
    marginBottom    : '32px',
    display         : 'flex',
    alignItems      : 'center',
    gap             : '8px',
  },
  h1: {
    fontFamily      : "'Syne', sans-serif",
    fontSize        : 'clamp(36px, 6vw, 72px)',
    fontWeight      : 800,
    lineHeight      : 1.1,
    color           : '#ffffff',
    marginBottom    : '24px',
    letterSpacing   : '-0.02em',
  },
  h1Accent: {
    color           : '#a3e635',
  },
  sub: {
    fontFamily      : "'Syne', sans-serif",
    fontSize        : '18px',
    color           : '#7a8a7a',
    lineHeight      : 1.7,
    marginBottom    : '48px',
    maxWidth        : '520px',
  },
  inputRow: {
    display         : 'flex',
    gap             : '12px',
    width           : '100%',
    maxWidth        : '560px',
    marginBottom    : '16px',
    flexWrap        : 'wrap' as const,
    justifyContent  : 'center',
  },
  input: {
    flex            : 1,
    minWidth        : '260px',
    background      : '#0d140d',
    border          : '1px solid #1e2e1e',
    borderRadius    : '8px',
    padding         : '14px 20px',
    color           : '#ffffff',
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '13px',
    outline         : 'none',
    transition      : 'border-color 0.2s',
  },
  btn: {
    background      : '#a3e635',
    color           : '#050805',
    border          : 'none',
    borderRadius    : '8px',
    padding         : '14px 24px',
    fontFamily      : "'Syne', sans-serif",
    fontWeight      : 700,
    fontSize        : '14px',
    cursor          : 'pointer',
    whiteSpace      : 'nowrap' as const,
    transition      : 'background 0.2s, transform 0.1s',
  },
  error: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '12px',
    color           : '#ff4444',
    marginBottom    : '16px',
  },
  hint: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '12px',
    color           : '#4a5a4a',
    marginBottom    : '64px',
  },
  hintLink: {
    color           : '#7a8a7a',
    textDecoration  : 'underline',
  },
  stats: {
    display         : 'flex',
    gap             : '48px',
    flexWrap        : 'wrap' as const,
    justifyContent  : 'center',
  },
  stat: {
    display         : 'flex',
    flexDirection   : 'column',
    alignItems      : 'center',
    gap             : '4px',
  },
  statValue: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '28px',
    fontWeight      : 700,
    color           : '#a3e635',
  },
  statLabel: {
    fontFamily      : "'Syne', sans-serif",
    fontSize        : '13px',
    color           : '#7a8a7a',
  },
  ticker: {
    background      : '#a3e635',
    overflow        : 'hidden',
    padding         : '10px 0',
    position        : 'relative',
    zIndex          : 10,
  },
  tickerTrack: {
    display         : 'flex',
    animation       : 'ticker 30s linear infinite',
    whiteSpace      : 'nowrap' as const,
  },
  tickerText: {
    fontFamily      : "'Space Mono', monospace",
    fontSize        : '12px',
    fontWeight      : 700,
    color           : '#050805',
    letterSpacing   : '0.1em',
    textTransform   : 'uppercase' as const,
  },
}
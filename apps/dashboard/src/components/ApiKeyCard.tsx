// ============================================================
// Verity — API Key Card + Usage Guide Modal
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

const ENDPOINTS = [
  {
    method : 'GET',
    path   : '/v1/intelligence',
    desc   : 'Query classified transaction records across chains',
    params : [
      { name: 'chainId',       type: 'number',  desc: '1 = Ethereum, 8453 = Base, 42161 = Arbitrum' },
      { name: 'riskLevel',     type: 'string',  desc: 'low | medium | high | critical' },
      { name: 'status',        type: 'string',  desc: 'success | failed | reverted' },
      { name: 'contractClass', type: 'string',  desc: 'defi | nft | bridge | unknown' },
      { name: 'limit',         type: 'number',  desc: 'Max records (default 50)' },
      { name: 'offset',        type: 'number',  desc: 'Pagination offset' },
    ],
    example: `curl https://verity-api-production-8852.up.railway.app/v1/intelligence \\
  -H "x-api-key: YOUR_KEY" \\
  -G -d "chainId=1&riskLevel=high&limit=10"`,
  },
  {
    method : 'GET',
    path   : '/v1/intelligence/:txHash',
    desc   : 'Fetch a single transaction intelligence record by hash',
    params : [],
    example: `curl https://verity-api-production-8852.up.railway.app/v1/intelligence/0xabc123... \\
  -H "x-api-key: YOUR_KEY"`,
  },
  {
    method : 'GET',
    path   : '/health',
    desc   : 'Check API and chain scanner status',
    params : [],
    example: `curl https://verity-api-production-8852.up.railway.app/health`,
  },
]

const METHOD_COLORS: Record<string, string> = {
  GET   : '#a3e635',
  POST  : '#60a5fa',
  DELETE: '#ff4444',
}

export default function ApiKeyCard({ apiKey, tier }: Props) {
  const [copied,      setCopied]      = useState(false)
  const [showModal,   setShowModal]   = useState(false)
  const [copiedSnip,  setCopiedSnip]  = useState<number | null>(null)
  const [activeTab,   setActiveTab]   = useState(0)

  function copy() {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copySnippet(code: string, idx: number) {
    navigator.clipboard.writeText(code)
    setCopiedSnip(idx)
    setTimeout(() => setCopiedSnip(null), 2000)
  }

  const masked = apiKey
    ? apiKey.slice(0, 8) + '••••••••••••••••' + apiKey.slice(-4)
    : 'No key loaded'

  return (
    <>
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

        <button onClick={() => setShowModal(true)} style={styles.docsBtn}>
          View API Usage Guide →
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalTitle}>API Reference</span>
                <span style={styles.modalSub}>
                  Base URL: https://verity-api-production-8852.up.railway.app
                </span>
              </div>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            {/* Auth box */}
            <div style={styles.authBox}>
              <span style={styles.authLabel}>AUTHENTICATION</span>
              <div style={styles.authRow}>
                <code style={styles.authCode}>x-api-key: {masked}</code>
                <button onClick={copy} style={styles.copyBtn}>
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
              <span style={styles.authHint}>
                All endpoints except /health require this header
              </span>
            </div>

            {/* Endpoint tabs */}
            <div style={styles.tabs}>
              {ENDPOINTS.map((ep, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  style={{
                    ...styles.tab,
                    background  : activeTab === i ? '#1a2e1a' : 'transparent',
                    color       : activeTab === i ? '#a3e635' : '#4a5a4a',
                    borderBottom: activeTab === i ? '2px solid #a3e635' : '2px solid transparent',
                  }}
                >
                  <span style={{ color: METHOD_COLORS[ep.method] }}>{ep.method}</span>
                  &nbsp;{ep.path}
                </button>
              ))}
            </div>

            {/* Active endpoint */}
            {(() => {
              const ep = ENDPOINTS[activeTab]
              return (
                <div style={styles.endpointBody}>
                  <p style={styles.epDesc}>{ep.desc}</p>

                  {ep.params.length > 0 && (
                    <div style={styles.paramsSection}>
                      <span style={styles.sectionLabel}>QUERY PARAMETERS</span>
                      <div style={styles.paramsTable}>
                        {ep.params.map(p => (
                          <div key={p.name} style={styles.paramRow}>
                            <code style={styles.paramName}>{p.name}</code>
                            <span style={styles.paramType}>{p.type}</span>
                            <span style={styles.paramDesc}>{p.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={styles.codeSection}>
                    <div style={styles.codeSectionHeader}>
                      <span style={styles.sectionLabel}>EXAMPLE REQUEST</span>
                      <button
                        onClick={() => copySnippet(ep.example, activeTab)}
                        style={styles.copySnipBtn}
                      >
                        {copiedSnip === activeTab ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre style={styles.codeBlock}>{ep.example}</pre>
                  </div>
                </div>
              )
            })()}

            {/* Tier limits */}
            <div style={styles.tierBox}>
              <span style={styles.sectionLabel}>PLAN LIMITS</span>
              <div style={styles.tierGrid}>
                {[
                  { tier: 'Free',     limit: '1,000',  chains: 'Ethereum only',  price: '$0'    },
                  { tier: 'Builder',  limit: '10,000', chains: '3 chains',       price: '$35/mo'},
                  { tier: 'Pro',      limit: '50,000', chains: '3 chains',       price: '$75/mo'},
                  { tier: 'Enterprise', limit: '∞',   chains: 'All chains',     price: 'Custom'},
                ].map(t => (
                  <div
                    key={t.tier}
                    style={{
                      ...styles.tierCard,
                      border: t.tier.toLowerCase() === tier
                        ? '1px solid #a3e635'
                        : '1px solid #1e2e1e',
                    }}
                  >
                    <span style={{
                      ...styles.tierName,
                      color: t.tier.toLowerCase() === tier ? '#a3e635' : '#7a8a7a',
                    }}>{t.tier}</span>
                    <span style={styles.tierLimit}>{t.limit} queries</span>
                    <span style={styles.tierChains}>{t.chains}</span>
                    <span style={styles.tierPrice}>{t.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '10px',
    letterSpacing: '0.15em',
    color        : '#4a5a4a',
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
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '12px',
    color        : '#ffffff',
    letterSpacing: '0.05em',
  },
  copyBtn: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '11px',
    color      : '#a3e635',
    background : 'transparent',
    border     : 'none',
    cursor     : 'pointer',
    padding    : '4px 8px',
    flexShrink : 0,
  },
  hint: {
    fontFamily: "'Syne', sans-serif",
    fontSize  : '12px',
    color     : '#4a5a4a',
  },
  code: {
    fontFamily  : "'Space Mono', monospace",
    fontSize    : '11px',
    color       : '#7a8a7a',
    background  : '#131f13',
    padding     : '1px 6px',
    borderRadius: '4px',
  },
  docsBtn: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '12px',
    color        : '#a3e635',
    background   : 'rgba(163,230,53,0.08)',
    border       : '1px solid rgba(163,230,53,0.2)',
    borderRadius : '8px',
    padding      : '10px 16px',
    cursor       : 'pointer',
    letterSpacing: '0.05em',
    transition   : 'all 0.15s',
    textAlign    : 'left' as const,
  },
  // Modal
  overlay: {
    position      : 'fixed',
    inset         : 0,
    background    : 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(4px)',
    zIndex        : 1000,
    display       : 'flex',
    alignItems    : 'center',
    justifyContent: 'center',
    padding       : '24px',
  },
  modal: {
    background   : '#0a120a',
    border       : '1px solid #1e2e1e',
    borderRadius : '16px',
    width        : '100%',
    maxWidth     : '760px',
    maxHeight    : '85vh',
    overflowY    : 'auto',
    display      : 'flex',
    flexDirection: 'column',
    gap          : '0',
  },
  modalHeader: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'flex-start',
    padding        : '24px 24px 20px',
    borderBottom   : '1px solid #1e2e1e',
  },
  modalTitle: {
    fontFamily : "'Syne', sans-serif",
    fontSize   : '20px',
    fontWeight : 700,
    color      : '#e0e8e0',
    display    : 'block',
  },
  modalSub: {
    fontFamily : "'Space Mono', monospace",
    fontSize   : '11px',
    color      : '#4a5a4a',
    display    : 'block',
    marginTop  : '4px',
  },
  closeBtn: {
    background  : 'transparent',
    border      : '1px solid #1e2e1e',
    color       : '#4a5a4a',
    borderRadius: '6px',
    padding     : '6px 10px',
    cursor      : 'pointer',
    fontSize    : '14px',
    fontFamily  : "'Space Mono', monospace",
  },
  authBox: {
    margin     : '20px 24px',
    background : '#0d140d',
    border     : '1px solid #1e2e1e',
    borderRadius: '10px',
    padding    : '16px',
    display    : 'flex',
    flexDirection: 'column',
    gap        : '8px',
  },
  authLabel: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '10px',
    letterSpacing: '0.15em',
    color        : '#4a5a4a',
  },
  authRow: {
    display       : 'flex',
    justifyContent: 'space-between',
    alignItems    : 'center',
    background    : '#131f13',
    borderRadius  : '6px',
    padding       : '10px 14px',
  },
  authCode: {
    fontFamily: "'Space Mono', monospace",
    fontSize  : '12px',
    color     : '#ffffff',
  },
  authHint: {
    fontFamily: "'Syne', sans-serif",
    fontSize  : '11px',
    color     : '#4a5a4a',
  },
  tabs: {
    display   : 'flex',
    padding   : '0 24px',
    borderBottom: '1px solid #1e2e1e',
    gap       : '4px',
    overflowX : 'auto' as const,
  },
  tab: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '11px',
    padding      : '10px 14px',
    cursor       : 'pointer',
    border       : 'none',
    whiteSpace   : 'nowrap' as const,
    letterSpacing: '0.05em',
    transition   : 'all 0.15s',
  },
  endpointBody: {
    padding      : '20px 24px',
    display      : 'flex',
    flexDirection: 'column',
    gap          : '16px',
  },
  epDesc: {
    fontFamily: "'Syne', sans-serif",
    fontSize  : '14px',
    color     : '#7a8a7a',
  },
  sectionLabel: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '10px',
    letterSpacing: '0.15em',
    color        : '#4a5a4a',
  },
  paramsSection: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '8px',
  },
  paramsTable: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '4px',
  },
  paramRow: {
    display    : 'grid',
    gridTemplateColumns: '140px 70px 1fr',
    gap        : '12px',
    padding    : '8px 12px',
    background : '#0d140d',
    borderRadius: '6px',
    alignItems : 'center',
  },
  paramName: {
    fontFamily: "'Space Mono', monospace",
    fontSize  : '12px',
    color     : '#a3e635',
  },
  paramType: {
    fontFamily: "'Space Mono', monospace",
    fontSize  : '11px',
    color     : '#4a5a4a',
  },
  paramDesc: {
    fontFamily: "'Syne', sans-serif",
    fontSize  : '12px',
    color     : '#7a8a7a',
  },
  codeSection: {
    display      : 'flex',
    flexDirection: 'column',
    gap          : '8px',
  },
  codeSectionHeader: {
    display        : 'flex',
    justifyContent : 'space-between',
    alignItems     : 'center',
  },
  copySnipBtn: {
    fontFamily: "'Space Mono', monospace",
    fontSize  : '11px',
    color     : '#a3e635',
    background: 'transparent',
    border    : 'none',
    cursor    : 'pointer',
    padding   : '4px 8px',
  },
  codeBlock: {
    background   : '#060c06',
    border       : '1px solid #1e2e1e',
    borderRadius : '8px',
    padding      : '16px',
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '11px',
    color        : '#7a8a7a',
    overflowX    : 'auto' as const,
    lineHeight   : 1.7,
    whiteSpace   : 'pre' as const,
  },
  tierBox: {
    borderTop    : '1px solid #1e2e1e',
    padding      : '20px 24px 24px',
    display      : 'flex',
    flexDirection: 'column',
    gap          : '12px',
  },
  tierGrid: {
    display             : 'grid',
    gridTemplateColumns : 'repeat(4, 1fr)',
    gap                 : '10px',
  },
  tierCard: {
    background   : '#0d140d',
    borderRadius : '8px',
    padding      : '12px',
    display      : 'flex',
    flexDirection: 'column',
    gap          : '4px',
  },
  tierName: {
    fontFamily   : "'Space Mono', monospace",
    fontSize     : '11px',
    fontWeight   : 700,
    letterSpacing: '0.1em',
  },
  tierLimit: {
    fontFamily: "'Syne', sans-serif",
    fontSize  : '14px',
    fontWeight: 700,
    color     : '#e0e8e0',
  },
  tierChains: {
    fontFamily: "'Space Mono', monospace",
    fontSize  : '10px',
    color     : '#4a5a4a',
  },
  tierPrice: {
    fontFamily: "'Space Mono', monospace",
    fontSize  : '11px',
    color     : '#7a8a7a',
    marginTop : '4px',
  },
}
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks'
import { logout } from '@multiversx/sdk-dapp/utils'
import { getUserGenerations, getUserGenerationsToday, type Generation } from '../lib/contract'
import { downloadCode, fetchCodeFromIPFS } from '../lib/ipfs'

export function GenerationsList() {
  const navigate = useNavigate()
  const isLoggedIn = useGetIsLoggedIn()
  const { address } = useGetAccountInfo()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [dailyCount, setDailyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [previewCode, setPreviewCode] = useState<{ id: number; code: string } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/')
      return
    }
    fetchData()
  }, [address, isLoggedIn, navigate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [gens, count] = await Promise.all([
        getUserGenerations(address),
        getUserGenerationsToday(address)
      ])
      setGenerations(gens)
      setDailyCount(count)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (gen: Generation) => {
    if (!gen.codeHash) return
    
    setDownloadingId(gen.id)
    try {
      const code = await fetchCodeFromIPFS(gen.codeHash)
      downloadCode(code, `contract_${gen.id}.rs`)
    } catch (error) {
      alert('Failed to download code from IPFS')
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePreview = async (gen: Generation) => {
    if (!gen.codeHash) return
    
    if (previewCode?.id === gen.id) {
      setPreviewCode(null)
      return
    }

    setLoadingPreview(true)
    try {
      const code = await fetchCodeFromIPFS(gen.codeHash)
      setPreviewCode({ id: gen.id, code })
    } catch (error) {
      alert('Failed to load code preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Code copied to clipboard!')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#10b981'
      case 'Pending': return '#f59e0b'
      case 'Failed': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const handleLogout = () => {
    logout(window.location.origin)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: 'rgba(20, 20, 20, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '0.75rem 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          <h1
            style={{
              fontSize: '1rem',
              fontWeight: '700',
              margin: 0,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/')}
          >
            Contract Generator
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => navigate('/')}
              title="Back"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
              </svg>
            </button>
            <span
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: 'monospace',
              }}
            >
              {address.substring(0, 6)}...
              {address.substring(address.length - 4)}
            </span>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', height: 'calc(100vh - 80px)', overflow: 'auto' }}>
        {loading ? (
          <div>
            <div className="skeleton" style={{ height: '200px', borderRadius: '1rem', marginBottom: '1rem', backgroundColor: '#1e293b' }} />
            <div className="skeleton" style={{ height: '150px', borderRadius: '1rem', marginBottom: '1rem', backgroundColor: '#1e293b' }} />
            <div className="skeleton" style={{ height: '150px', borderRadius: '1rem', backgroundColor: '#1e293b' }} />
          </div>
        ) : (
          <>
            {/* Header with rate limit */}
            <div className="card slide-in" style={{ backgroundColor: 'rgba(30, 30, 30, 0.6)', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>My Generations</h2>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0.25rem 0 0 0' }}>
                    Your contract generation history
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: dailyCount >= 3 ? '#ef4444' : '#06b6d4' }}>
                    {dailyCount}/3
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Generations today
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div style={{ marginTop: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', height: '0.375rem', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${(dailyCount / 3) * 100}%`, 
                    height: '100%', 
                    backgroundColor: dailyCount >= 3 ? '#ef4444' : '#06b6d4',
                    transition: 'width 0.5s ease'
                  }} 
                />
              </div>
              
              {dailyCount >= 3 && (
                <p style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.75rem', margin: '0.75rem 0 0 0' }}>
                  ⚠️ Daily limit reached. Resets at midnight UTC.
                </p>
              )}
            </div>

            {/* Generations list */}
            {generations.length === 0 ? (
              <div className="fade-in" style={{ backgroundColor: 'rgba(30, 30, 30, 0.6)', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.5 }}>📄</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#ffffff', marginBottom: '0.5rem' }}>
                  No generations yet
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: 0, fontSize: '0.875rem' }}>
                  Generate your first smart contract to see it here!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {generations.map((gen, index) => (
                  <div 
                    key={gen.id}
                    className="card fade-in"
                    style={{ 
                      backgroundColor: 'rgba(30, 30, 30, 0.6)', 
                      borderRadius: '1rem', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      padding: '1.25rem',
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#ffffff', margin: 0 }}>
                            Generation #{gen.id}
                          </h3>
                          <span 
                            style={{ 
                              padding: '0.2rem 0.6rem', 
                              fontSize: '0.7rem', 
                              fontWeight: '600',
                              backgroundColor: 'rgba(6, 182, 212, 0.2)',
                              color: '#06b6d4',
                              borderRadius: '0.25rem',
                              border: '1px solid rgba(6, 182, 212, 0.3)'
                            }}
                          >
                            {gen.category}
                          </span>
                          <span 
                            style={{ 
                              padding: '0.2rem 0.6rem', 
                              fontSize: '0.7rem', 
                              fontWeight: '600',
                              backgroundColor: getStatusColor(gen.status) + '20',
                              color: getStatusColor(gen.status),
                              borderRadius: '0.25rem',
                              border: `1px solid ${getStatusColor(gen.status)}40`
                            }}
                          >
                            {gen.status}
                          </span>
                        </div>
                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', margin: '0.5rem 0', lineHeight: '1.4' }}>
                          {gen.description.length > 120 ? gen.description.substring(0, 120) + '...' : gen.description}
                        </p>
                        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', margin: '0.25rem 0 0 0' }}>
                          🕒 {formatDate(gen.timestamp)}
                        </p>
                      </div>
                    </div>

                    {gen.status === 'Completed' && gen.codeHash && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleDownload(gen)}
                            disabled={downloadingId === gen.id}
                            className="btn"
                            style={{ 
                              padding: '0.4rem 1rem', 
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: 'white', 
                              backgroundColor: downloadingId === gen.id ? 'rgba(255, 255, 255, 0.2)' : '#06b6d4',
                              border: 'none', 
                              borderRadius: '0.375rem',
                              cursor: downloadingId === gen.id ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {downloadingId === gen.id ? '⏳ Downloading...' : '📥 Download'}
                          </button>
                          <button
                            onClick={() => handlePreview(gen)}
                            disabled={loadingPreview}
                            className="btn"
                            style={{ 
                              padding: '0.4rem 1rem', 
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#06b6d4',
                              backgroundColor: 'rgba(6, 182, 212, 0.1)',
                              border: '1px solid rgba(6, 182, 212, 0.3)',
                              borderRadius: '0.375rem',
                              cursor: loadingPreview ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {loadingPreview ? '⏳ Loading...' : previewCode?.id === gen.id ? '👁️ Hide' : '👁️ Preview'}
                          </button>
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${gen.codeHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn"
                            style={{ 
                              padding: '0.4rem 1rem', 
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: 'rgba(255, 255, 255, 0.6)',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '0.375rem',
                              textDecoration: 'none',
                              display: 'inline-block'
                            }}
                          >
                            🔗 IPFS
                          </a>
                        </div>

                        {/* Code Preview */}
                        {previewCode?.id === gen.id && (
                          <div className="fade-in code-preview" style={{ marginTop: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600' }}>contract.rs</span>
                              <button
                                onClick={() => copyToClipboard(previewCode.code)}
                                className="btn"
                                style={{ 
                                  padding: '0.25rem 0.5rem', 
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  color: '#06b6d4',
                                  backgroundColor: 'transparent',
                                  border: '1px solid rgba(6, 182, 212, 0.3)',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer'
                                }}
                              >
                                📋 Copy
                              </button>
                            </div>
                            <pre style={{ maxHeight: '300px', overflow: 'auto', margin: 0, padding: '0.75rem', fontSize: '0.7rem', lineHeight: '1.4', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
                              <code style={{ color: '#e2e8f0' }}>{previewCode.code}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

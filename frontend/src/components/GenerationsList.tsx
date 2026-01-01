import { useEffect, useState } from 'react'
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks'
import { getUserGenerations, getUserGenerationsToday, type Generation } from '../lib/contract'
import { downloadCode, fetchCodeFromIPFS } from '../lib/ipfs'

export function GenerationsList() {
  const { address } = useGetAccountInfo()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [dailyCount, setDailyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [previewCode, setPreviewCode] = useState<{ id: number; code: string } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    fetchData()
  }, [address])

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

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Loading skeleton */}
        <div className="skeleton" style={{ height: '200px', borderRadius: '1rem', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '150px', borderRadius: '1rem', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: '150px', borderRadius: '1rem' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header with rate limit */}
      <div className="card slide-in" style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#f1f5f9' }}>My Generations</h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>
              Your contract generation history
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: dailyCount >= 3 ? '#ef4444' : '#3b82f6' }}>
              {dailyCount}/3
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Generations today
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div style={{ marginTop: '1.5rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', height: '0.5rem', overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${(dailyCount / 3) * 100}%`, 
              height: '100%', 
              backgroundColor: dailyCount >= 3 ? '#ef4444' : '#3b82f6',
              transition: 'width 0.5s ease'
            }} 
          />
        </div>
        
        {dailyCount >= 3 && (
          <p style={{ fontSize: '0.875rem', color: '#fbbf24', marginTop: '1rem', margin: '1rem 0 0 0' }}>
            ⚠️ Daily limit reached. Resets at midnight UTC.
          </p>
        )}
      </div>

      {/* Generations list */}
      {generations.length === 0 ? (
        <div className="fade-in" style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📄</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f1f5f9', marginBottom: '0.5rem' }}>
            No generations yet
          </h3>
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
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
                backgroundColor: '#1e293b', 
                borderRadius: '1rem', 
                border: '1px solid #334155', 
                padding: '1.5rem',
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>
                      Generation #{gen.id}
                    </h3>
                    <span 
                      style={{ 
                        padding: '0.25rem 0.75rem', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        backgroundColor: '#0f172a',
                        color: '#60a5fa',
                        borderRadius: '0.375rem',
                        border: '1px solid #1e40af'
                      }}
                    >
                      {gen.category}
                    </span>
                    <span 
                      style={{ 
                        padding: '0.25rem 0.75rem', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        backgroundColor: getStatusColor(gen.status) + '20',
                        color: getStatusColor(gen.status),
                        borderRadius: '0.375rem',
                        border: `1px solid ${getStatusColor(gen.status)}`
                      }}
                    >
                      {gen.status}
                    </span>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0', lineHeight: '1.5' }}>
                    {gen.description.length > 150 ? gen.description.substring(0, 150) + '...' : gen.description}
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.5rem 0 0 0' }}>
                    🕒 {formatDate(gen.timestamp)}
                  </p>
                </div>
              </div>

              {gen.status === 'Completed' && gen.codeHash && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleDownload(gen)}
                      disabled={downloadingId === gen.id}
                      className="btn"
                      style={{ 
                        padding: '0.5rem 1.5rem', 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'white', 
                        backgroundColor: downloadingId === gen.id ? '#475569' : '#3b82f6',
                        border: 'none', 
                        borderRadius: '0.375rem'
                      }}
                    >
                      {downloadingId === gen.id ? '⏳ Downloading...' : '📥 Download'}
                    </button>
                    <button
                      onClick={() => handlePreview(gen)}
                      disabled={loadingPreview}
                      className="btn"
                      style={{ 
                        padding: '0.5rem 1.5rem', 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#60a5fa',
                        backgroundColor: '#0f172a',
                        border: '1px solid #3b82f6',
                        borderRadius: '0.375rem'
                      }}
                    >
                      {loadingPreview ? '⏳ Loading...' : previewCode?.id === gen.id ? '👁️ Hide Preview' : '👁️ Preview'}
                    </button>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${gen.codeHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ 
                        padding: '0.5rem 1.5rem', 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#94a3b8',
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
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
                    <div className="fade-in code-preview" style={{ marginTop: '1rem', border: '1px solid #475569', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #475569', backgroundColor: '#1e293b' }}>
                        <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: '600' }}>contract.rs</span>
                        <button
                          onClick={() => copyToClipboard(previewCode.code)}
                          className="btn"
                          style={{ 
                            padding: '0.25rem 0.75rem', 
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#60a5fa',
                            backgroundColor: 'transparent',
                            border: '1px solid #3b82f6',
                            borderRadius: '0.25rem'
                          }}
                        >
                          📋 Copy
                        </button>
                      </div>
                      <pre style={{ maxHeight: '400px', overflow: 'auto', margin: 0, padding: '1rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
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
    </div>
  )
}

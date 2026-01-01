import { useState, useEffect } from 'react'
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks'
import { getUserGenerationsToday } from '../lib/contract'

interface GenerateFormProps {
  onStartGeneration: (sessionId: string, description: string, category: string) => void
}

export function GenerateForm({ onStartGeneration }: GenerateFormProps) {
  const { address } = useGetAccountInfo()
  const [description, setDescription] = useState('')
  const [dailyCount, setDailyCount] = useState(0)
  const [loadingCount, setLoadingCount] = useState(true)

  useEffect(() => {
    fetchDailyCount()
  }, [address])

  const fetchDailyCount = async () => {
    setLoadingCount(true)
    try {
      const count = await getUserGenerationsToday(address)
      setDailyCount(count)
    } catch (error) {
      console.error('Error fetching daily count:', error)
    } finally {
      setLoadingCount(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim()) return
    if (dailyCount >= 3) {
      alert('Daily limit reached (3/day)')
      return
    }

    const sessionId = `gen-${Date.now()}-${Math.random().toString(36).substring(7)}`
    onStartGeneration(sessionId, description, 'DeFi')
    setDescription('')
  }

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', textAlign: 'center' }}>
      {/* Hero Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ 
          fontSize: 'clamp(2rem, 4vw, 3rem)', 
          fontWeight: '700', 
          marginBottom: '1rem', 
          color: '#ffffff',
          lineHeight: '1.1',
          letterSpacing: '-0.02em'
        }}>
          What will you <span style={{ color: '#06b6d4' }}>build</span> today?
        </h2>
        <p style={{ fontSize: '1.125rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
          Generate smart contracts with AI
        </p>
      </div>

      {/* Features - Small Icons Above Input */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>AI-Powered</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#06b6d4" strokeWidth="2"/>
            <path d="M9 9L12 12L9 15" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 15H17" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>Real-Time IDE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14.7 6.3C15.1 5.9 15.7 5.9 16.1 6.3L20.7 10.9C21.1 11.3 21.1 11.9 20.7 12.3L16.1 16.9C15.7 17.3 15.1 17.3 14.7 16.9C14.3 16.5 14.3 15.9 14.7 15.5L18.2 12L14.7 8.5C14.3 8.1 14.3 7.5 14.7 7.1Z" fill="#06b6d4"/>
            <path d="M9.3 6.3C8.9 5.9 8.3 5.9 7.9 6.3L3.3 10.9C2.9 11.3 2.9 11.9 3.3 12.3L7.9 16.9C8.3 17.3 8.9 17.3 9.3 16.9C9.7 16.5 9.7 15.9 9.3 15.5L5.8 12L9.3 8.5C9.7 8.1 9.7 7.5 9.3 7.1Z" fill="#06b6d4"/>
          </svg>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>Auto-Compile</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#06b6d4" strokeWidth="2"/>
            <path d="M8 12L11 15L16 9" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>Self-Healing</span>
        </div>
      </div>

      {/* Input Section - Icon Button Centered */}
      <div style={{
        backgroundColor: 'rgba(30, 30, 30, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRadius: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0.5rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative'
      }}>
        {/* Daily Count Badge */}
        {!loadingCount && (
          <div style={{
            position: 'absolute',
            top: '-0.75rem',
            right: '1rem',
            fontSize: '0.7rem',
            color: 'rgba(255, 255, 255, 0.5)',
            padding: '0.2rem 0.6rem',
            backgroundColor: 'rgba(20, 20, 20, 0.9)',
            borderRadius: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {dailyCount}/3
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{
            backgroundColor: 'rgba(20, 20, 20, 0.8)',
            borderRadius: '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.75rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your smart contract..."
              rows={3}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'none',
                lineHeight: '1.5'
              }}
              required
            />

            {/* Icon Button - Centered */}
            <button
              type="submit"
              disabled={!description.trim() || dailyCount >= 3}
              title="Generate"
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: !description.trim() || dailyCount >= 3 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : '#06b6d4',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: !description.trim() || dailyCount >= 3 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
                fontSize: '1.25rem',
                color: '#ffffff',
                fontWeight: 'bold'
              }}
            >
              →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

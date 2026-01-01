import { useState } from 'react'
import { useGetIsLoggedIn, useGetAccountInfo } from '@multiversx/sdk-dapp/hooks'
import { logout } from '@multiversx/sdk-dapp/utils'
import { ExtensionLoginButton } from '@multiversx/sdk-dapp/UI/extension/ExtensionLoginButton'
import { WebWalletLoginButton } from '@multiversx/sdk-dapp/UI/webWallet/WebWalletLoginButton'
import { WalletConnectLoginButton } from '@multiversx/sdk-dapp/UI/walletConnect/WalletConnectLoginButton'
import { GenerateForm } from './components/GenerateForm'
import { GenerationsList } from './components/GenerationsList'
import { GenerationStudio } from './components/GenerationStudio'
import './App.css'

function App() {
  const isLoggedIn = useGetIsLoggedIn()
  const { address } = useGetAccountInfo()
  const [showGenerations, setShowGenerations] = useState(false)
  const [activeGeneration, setActiveGeneration] = useState<{
    sessionId: string
    description: string
    category: string
  } | null>(null)

  const handleLogout = () => {
    logout(window.location.origin)
  }

  const handleStartGeneration = (sessionId: string, description: string, category: string) => {
    setActiveGeneration({ sessionId, description, category })
  }

  const handleCloseStudio = () => {
    setActiveGeneration(null)
  }

  // If generation studio is active, show it fullscreen
  if (activeGeneration) {
    return (
      <GenerationStudio
        sessionId={activeGeneration.sessionId}
        description={activeGeneration.description}
        category={activeGeneration.category}
        onClose={handleCloseStudio}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'rgba(20, 20, 20, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Contract Generator
          </h1>
          {isLoggedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setShowGenerations(!showGenerations)}
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.875rem', 
                  color: '#ffffff', 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '0.5rem', 
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                {showGenerations ? '← Back' : 'History'}
              </button>
              <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
                {address.substring(0, 6)}...{address.substring(address.length - 4)}
              </span>
              <button
                onClick={handleLogout}
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.875rem', 
                  color: '#ffffff', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '0.5rem', 
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '2rem 1rem' }}>
        {/* Gradient Background - Neon Turquoise */}
        <div style={{
          position: 'absolute',
          bottom: '-50%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '150%',
          height: '150%',
          background: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.2) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1200px' }}>
          {!isLoggedIn ? (
            <div style={{ textAlign: 'center' }}>
              {/* Hero Section */}
              <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ 
                  fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
                  fontWeight: '700', 
                  marginBottom: '1rem', 
                  color: '#ffffff',
                  lineHeight: '1.1',
                  letterSpacing: '-0.02em'
                }}>
                  What will you <span style={{ color: '#06b6d4' }}>build</span> today?
                </h2>
                <p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                  Generate smart contracts with AI
                </p>
              </div>

              {/* Login Card */}
              <div style={{ 
                maxWidth: '500px', 
                margin: '0 auto 3rem',
                backgroundColor: 'rgba(30, 30, 30, 0.6)', 
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem', 
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                padding: '2.5rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', color: '#ffffff' }}>
                  Connect Wallet
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <ExtensionLoginButton
                    callbackRoute="/"
                    loginButtonText="DeFi Wallet"
                    className="custom-login-btn"
                  />
                  <WebWalletLoginButton
                    callbackRoute="/"
                    loginButtonText="Web Wallet"
                    className="custom-login-btn"
                  />
                  <WalletConnectLoginButton
                    callbackRoute="/"
                    loginButtonText="xPortal"
                    className="custom-login-btn"
                  />
                </div>
              </div>

              {/* Features - SVG Icons */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '2rem',
                maxWidth: '700px',
                margin: '0 auto'
              }}>
                {/* AI-Powered */}
                <div style={{ textAlign: 'center' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 0.75rem' }}>
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>AI-Powered</div>
                </div>

                {/* Real-Time IDE */}
                <div style={{ textAlign: 'center' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 0.75rem' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#06b6d4" strokeWidth="2"/>
                    <path d="M9 9L12 12L9 15" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 15H17" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Real-Time IDE</div>
                </div>

                {/* Auto-Compile */}
                <div style={{ textAlign: 'center' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 0.75rem' }}>
                    <path d="M14.7 6.3C15.1 5.9 15.7 5.9 16.1 6.3L20.7 10.9C21.1 11.3 21.1 11.9 20.7 12.3L16.1 16.9C15.7 17.3 15.1 17.3 14.7 16.9C14.3 16.5 14.3 15.9 14.7 15.5L18.2 12L14.7 8.5C14.3 8.1 14.3 7.5 14.7 7.1Z" fill="#06b6d4"/>
                    <path d="M9.3 6.3C8.9 5.9 8.3 5.9 7.9 6.3L3.3 10.9C2.9 11.3 2.9 11.9 3.3 12.3L7.9 16.9C8.3 17.3 8.9 17.3 9.3 16.9C9.7 16.5 9.7 15.9 9.3 15.5L5.8 12L9.3 8.5C9.7 8.1 9.7 7.5 9.3 7.1Z" fill="#06b6d4"/>
                  </svg>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Auto-Compile</div>
                </div>

                {/* Self-Healing */}
                <div style={{ textAlign: 'center' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 0.75rem' }}>
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#06b6d4" strokeWidth="2"/>
                    <path d="M8 12L11 15L16 9" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>Self-Healing</div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {showGenerations ? <GenerationsList /> : <GenerateForm onStartGeneration={handleStartGeneration} />}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App

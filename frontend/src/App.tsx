import { useState } from 'react'
import { useGetIsLoggedIn, useGetAccountInfo } from '@multiversx/sdk-dapp/hooks'
import { logout } from '@multiversx/sdk-dapp/utils'
import { ExtensionLoginButton } from '@multiversx/sdk-dapp/UI/extension/ExtensionLoginButton'
import { WebWalletLoginButton } from '@multiversx/sdk-dapp/UI/webWallet/WebWalletLoginButton'
import { WalletConnectLoginButton } from '@multiversx/sdk-dapp/UI/walletConnect/WalletConnectLoginButton'
import { GenerateForm } from './components/GenerateForm'
import { GenerationsList } from './components/GenerationsList'
import './App.css'

function App() {
  const isLoggedIn = useGetIsLoggedIn()
  const { address } = useGetAccountInfo()
  const [showGenerations, setShowGenerations] = useState(false)

  const handleLogout = () => {
    logout(window.location.origin)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#f1f5f9' }}>⚡ Contract Generator</h1>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>AI-powered Rust contracts for MultiversX</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isLoggedIn && (
                <>
                  <button
                    onClick={() => setShowGenerations(!showGenerations)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#60a5fa', background: 'none', border: '1px solid #3b82f6', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}
                  >
                    {showGenerations ? '← Generate' : 'My Generations'}
                  </button>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {address.substring(0, 10)}...{address.substring(address.length - 6)}
                  </span>
                  <button
                    onClick={handleLogout}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'white', backgroundColor: '#ef4444', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 2rem' }}>
        {!isLoggedIn ? (
          <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f1f5f9', textAlign: 'center' }}>
              Generate Smart Contracts with AI
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#94a3b8', marginBottom: '2rem', textAlign: 'center' }}>
              Describe your contract in plain English and let Gemini AI generate production-ready Rust code
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              <ExtensionLoginButton
                callbackRoute="/"
                loginButtonText="🔐 DeFi Wallet Extension"
                className="custom-login-btn"
              />
              <WebWalletLoginButton
                callbackRoute="/"
                loginButtonText="🌐 Web Wallet"
                className="custom-login-btn"
              />
              <WalletConnectLoginButton
                callbackRoute="/"
                loginButtonText="📱 xPortal App"
                className="custom-login-btn"
              />
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', border: '1px solid #1e40af' }}>
              <p style={{ fontSize: '0.875rem', color: '#60a5fa', margin: 0, textAlign: 'center' }}>
                ⚡ <strong>Free:</strong> 3 generations per day • 🔒 <strong>Secure:</strong> On-chain rate limiting • 📦 <strong>IPFS:</strong> Permanent storage
              </p>
            </div>
          </div>
        ) : showGenerations ? (
          <GenerationsList />
        ) : (
          <GenerateForm />
        )}
      </main>
    </div>
  )
}

export default App

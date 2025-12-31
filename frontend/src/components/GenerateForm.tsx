import { useState } from 'react'
import { sendTransactions } from '@multiversx/sdk-dapp/services'
import { refreshAccount } from '@multiversx/sdk-dapp/utils'

// Helper to convert string to hex (browser-compatible)
const stringToHex = (str: string) => {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
}

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

const CATEGORIES = ['DeFi', 'NFT', 'DAO', 'GameFi', 'Utility']

export function GenerateForm() {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('DeFi')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim()) return

    setIsSubmitting(true)

    try {
      const descHex = stringToHex(description)
      const catHex = stringToHex(category)

      await sendTransactions({
        transactions: [{
          value: '0',
          data: `generateContract@${descHex}@${catHex}`,
          receiver: CONTRACT_ADDRESS,
          gasLimit: 10000000,
        }],
        transactionsDisplayInfo: {
          processingMessage: 'Submitting generation request...',
          errorMessage: 'Transaction failed',
          successMessage: 'Success! Check "My Generations" in ~10 seconds',
        },
      })

      setDescription('')
      await refreshAccount()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '2.5rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#f1f5f9' }}>Generate Smart Contract</h2>
      <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '2rem' }}>Powered by Gemini 2.0 Flash • Stored on IPFS</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#f1f5f9' }}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #475569', borderRadius: '0.5rem', backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: '1rem' }}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#f1f5f9' }}>Contract Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your smart contract in detail...&#10;&#10;Example: Create a staking contract where users can stake EGLD tokens and earn 10% APY rewards. Include functions for staking, unstaking, claiming rewards, and viewing staked balance."
            rows={10}
            style={{ width: '100%', padding: '1rem', border: '1px solid #475569', borderRadius: '0.5rem', resize: 'none', fontFamily: 'inherit', backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: '1rem', lineHeight: '1.6' }}
            required
          />
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            💡 Be specific about features, functions, and behavior. The more detail, the better the result!
          </p>
        </div>

        <div style={{ backgroundColor: '#1e3a8a', border: '1px solid #3b82f6', borderRadius: '0.5rem', padding: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#93c5fd', margin: 0 }}>
            <strong>⚡ Free Generation:</strong> You can generate up to 3 contracts per day. No payment required!
          </p>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '0.5rem', padding: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#fbbf24', margin: '0 0 0.5rem 0', fontWeight: '600' }}>
            ⚠️ Need testnet EGLD?
          </p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
            Get free devnet EGLD from the faucet: <a href="https://devnet-wallet.multiversx.com/faucet" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>MultiversX Devnet Faucet</a>
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !description.trim()}
          style={{ 
            width: '100%', 
            padding: '1rem 1.5rem', 
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'white', 
            backgroundColor: isSubmitting || !description.trim() ? '#475569' : '#3b82f6', 
            border: 'none', 
            borderRadius: '0.5rem', 
            cursor: isSubmitting || !description.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isSubmitting ? '⏳ Submitting...' : '🚀 Generate Contract'}
        </button>
      </form>
    </div>
  )
}

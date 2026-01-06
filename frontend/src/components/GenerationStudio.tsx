import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks'
import { sendTransactions } from '@multiversx/sdk-dapp/services'
import { refreshAccount } from '@multiversx/sdk-dapp/utils'
import Editor from '@monaco-editor/react'
import Split from 'react-split'
import JSZip from 'jszip'
import { SSEClient } from '../lib/sseClient'

// Helper to convert string to hex
const stringToHex = (str: string) => {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
}

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

export function GenerationStudio() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { address } = useGetAccountInfo()
  const { description, category } = location.state || { description: '', category: '' }
  
  const [files, setFiles] = useState<Map<string, string>>(new Map())
  const [currentFile, setCurrentFile] = useState<string>('src/lib.rs')
  const [terminal, setTerminal] = useState<string[]>([])
  const [status, setStatus] = useState<string>('Connecting...')
  const [progress, setProgress] = useState<number>(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [wasmPath, setWasmPath] = useState<string>('')
  const [ipfsHash, setIpfsHash] = useState<string>('')
  const [isDeploying, setIsDeploying] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      navigate('/')
      return
    }

    const client = new SSEClient(sessionId)
    
    client.on('connected', () => {
      addTerminalLine('Connected to generation service')
      addTerminalLine('Starting AI code generation...')
      startGeneration()
    })

    client.on('status', (data: any) => {
      setStatus(data.message)
      if (data.progress) setProgress(data.progress)
    })

    client.on('file', (data: any) => {
      setFiles(prev => new Map(prev).set(data.path, data.content))
      // Auto-open README.md when it arrives
      if (data.path === 'README.md') {
        setCurrentFile('README.md')
      }
    })

    client.on('terminal', (data: any) => {
      addTerminalLine(data.output, data.isError)
    })

    client.on('compile_start', () => {
      addTerminalLine('\\n--- Starting Compilation ---')
    })

    client.on('compile_result', (data: any) => {
      if (data.success) {
        addTerminalLine('Compilation successful!', false)
      } else {
        addTerminalLine('Compilation failed', true)
        if (data.errors) {
          addTerminalLine(data.errors, true)
        }
      }
    })

    client.on('fixing', (data: any) => {
      addTerminalLine(`\\nAI fixing errors (attempt ${data.attempt}/${data.maxAttempts})...`)
    })

    client.on('complete', (data: any) => {
      console.log('Complete event received:', data)
      setIsComplete(true)
      if (data.data.success) {
        setIsReady(true)
        setWasmPath(data.data.wasmPath)
        setIpfsHash(data.data.ipfsHash)
        addTerminalLine('\\nGeneration complete! Ready to deploy.')
        addTerminalLine('Click the Deploy to Blockchain button to deploy your contract.')
      } else {
        addTerminalLine('\\nGeneration failed: ' + data.data.error, true)
      }
    })

    client.on('error', (data: any) => {
      addTerminalLine('\\nError: ' + data.error, true)
    })

    client.connect(address)

    return () => {
      client.close()
    }
  }, [sessionId, address, navigate])

  const startGeneration = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${apiUrl}/api/generation/generate-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, description, category })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start generation')
      }
    } catch (error) {
      addTerminalLine('Failed to start generation: ' + error, true)
    }
  }

  const addTerminalLine = (line: string, isError: boolean = false) => {
    setTerminal(prev => [...prev, isError ? `[ERROR] ${line}` : line])
  }

  const handleDeploy = async () => {
    if (!isReady) {
      alert('Contract not ready yet. Wait for generation to complete.')
      return
    }

    setIsDeploying(true)
    addTerminalLine('\\nDeploying to MultiversX blockchain...')
    addTerminalLine('Please sign the transaction in your wallet...')
    
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
          processingMessage: 'Deploying contract to blockchain...',
          errorMessage: 'Deployment failed',
          successMessage: 'Contract deployed successfully!',
        },
      })

      addTerminalLine('Transaction submitted successfully!')
      addTerminalLine('Contract will be available on-chain shortly.')
      
      await refreshAccount()
    } catch (error: any) {
      addTerminalLine('Deployment error: ' + error.message, true)
    } finally {
      setIsDeploying(false)
    }
  }

  const downloadCode = () => {
    const code = files.get(currentFile) || ''
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.split('/').pop() || 'contract.rs'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAll = async () => {
    const zip = new JSZip()
    const folder = zip.folder('contract-project')
    
    files.forEach((content, path) => {
      folder?.file(path, content)
    })
    
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contract-project.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#2d2d30', borderBottom: '1px solid #3e3e42', padding: '0.5rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 style={{ margin: 0, color: '#cccccc', fontSize: '0.875rem', fontWeight: '600' }}>
                Session #{sessionId?.substring(0, 8)}
              </h2>
              <span style={{ color: '#858585', fontSize: '0.75rem' }}>
                {status}
              </span>
            </div>
            {ipfsHash && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', backgroundColor: '#1e1e1e', borderRadius: '0.25rem' }}>
                <span style={{ color: '#858585', fontSize: '0.75rem' }}>IPFS:</span>
                <a 
                  href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: '#0e639c', fontSize: '0.75rem', textDecoration: 'none' }}
                  title={ipfsHash}
                >
                  {ipfsHash.substring(0, 8)}...{ipfsHash.substring(ipfsHash.length - 6)}
                </a>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {files.size > 0 && (
              <>
                {/* Download Current File */}
                <button
                  onClick={downloadCode}
                  title="Download Current File"
                  style={{ 
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent', 
                    color: '#cccccc', 
                    border: 'none', 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff'
                    const svg = e.currentTarget.querySelector('svg')
                    if (svg) svg.style.stroke = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#cccccc'
                    const svg = e.currentTarget.querySelector('svg')
                    if (svg) svg.style.stroke = '#cccccc'
                  }}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#cccccc" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ transition: 'stroke 0.2s' }}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>

                {/* Download All Files */}
                <button
                  onClick={downloadAll}
                  title="Download All Files"
                  style={{ 
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent', 
                    color: '#cccccc', 
                    border: 'none', 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff'
                    const svg = e.currentTarget.querySelector('svg')
                    if (svg) svg.style.stroke = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#cccccc'
                    const svg = e.currentTarget.querySelector('svg')
                    if (svg) svg.style.stroke = '#cccccc'
                  }}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#cccccc" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ transition: 'stroke 0.2s' }}
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </button>
              </>
            )}

            {/* Deploy Button */}
            {isReady && (
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                title={isDeploying ? 'Deploying...' : 'Deploy to Blockchain'}
                style={{ 
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent', 
                  color: isDeploying ? '#64748b' : '#10b981', 
                  border: 'none', 
                  cursor: isDeploying ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isDeploying ? 0.5 : 1,
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  if (!isDeploying) {
                    e.currentTarget.style.color = '#34d399'
                    const svg = e.currentTarget.querySelector('svg')
                    if (svg) svg.style.stroke = '#34d399'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDeploying) {
                    e.currentTarget.style.color = '#10b981'
                    const svg = e.currentTarget.querySelector('svg')
                    if (svg) svg.style.stroke = '#10b981'
                  }
                }}
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={isDeploying ? '#64748b' : '#10b981'}
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ transition: 'stroke 0.2s' }}
                >
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
                </svg>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => navigate('/')}
              title="Close"
              style={{ 
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent', 
                color: '#cccccc', 
                border: 'none', 
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#f87171'
                const svg = e.currentTarget.querySelector('svg')
                if (svg) svg.style.stroke = '#f87171'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#cccccc'
                const svg = e.currentTarget.querySelector('svg')
                if (svg) svg.style.stroke = '#cccccc'
              }}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#cccccc" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ transition: 'stroke 0.2s' }}
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main content - Resizable panels */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Split
          sizes={[20, 50, 30]}
          minSize={150}
          gutterSize={4}
          className="split-horizontal"
          style={{ display: 'flex', width: '100%', height: '100%' }}
        >
        {/* File tree */}
        <div style={{ backgroundColor: '#252526', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#2d2d30', padding: '0.5rem 1rem', borderBottom: '1px solid #3e3e42' }}>
            <span style={{ color: '#cccccc', fontSize: '0.875rem', fontWeight: '600' }}>FILES</span>
          </div>
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
            {files.size === 0 ? (
              <p style={{ color: '#858585', fontSize: '0.875rem' }}>Generating files...</p>
            ) : (
              Array.from(files.keys()).map(path => (
                <div
                  key={path}
                  onClick={() => setCurrentFile(path)}
                  style={{
                    padding: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor: currentFile === path ? '#37373d' : 'transparent',
                    color: currentFile === path ? '#ffffff' : '#cccccc',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    marginBottom: '0.25rem'
                  }}
                >
                  {path}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Code editor */}
        <div style={{ backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#2d2d30', padding: '0.5rem 1rem', borderBottom: '1px solid #3e3e42' }}>
            <span style={{ color: '#cccccc', fontSize: '0.875rem' }}>{currentFile}</span>
          </div>
          <Editor
            height="100%"
            language={currentFile?.endsWith('.md') ? 'markdown' : 'rust'}
            theme="vs-dark"
            value={files.get(currentFile) || '// Waiting for code generation...'}
            options={{
              readOnly: true,
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: currentFile?.endsWith('.md') ? 'on' : 'off'
            }}
          />
        </div>

        {/* Terminal */}
        <div style={{ backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#2d2d30', padding: '0.5rem 1rem', borderBottom: '1px solid #3e3e42' }}>
            <span style={{ color: '#cccccc', fontSize: '0.875rem', fontWeight: '600' }}>TERMINAL</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {terminal.length === 0 ? (
              <div style={{ color: '#858585' }}>Waiting for connection...</div>
            ) : (
              terminal.map((line, i) => (
                <div
                  key={i}
                  style={{
                    color: line.startsWith('[ERROR]') ? '#f48771' : '#cccccc',
                    marginBottom: '0.25rem',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
        </Split>
      </div>


    </div>
  )
}

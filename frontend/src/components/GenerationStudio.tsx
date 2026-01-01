import { useEffect, useState } from 'react'
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks'
import { sendTransactions } from '@multiversx/sdk-dapp/services'
import { refreshAccount } from '@multiversx/sdk-dapp/utils'
import Editor from '@monaco-editor/react'
import Split from 'react-split'
import { SSEClient } from '../lib/sseClient'

interface GenerationStudioProps {
  sessionId: string
  description: string
  category: string
  onClose: () => void
}

// Helper to convert string to hex
const stringToHex = (str: string) => {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
}

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

export function GenerationStudio({ sessionId, description, category, onClose }: GenerationStudioProps) {
  const { address } = useGetAccountInfo()
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
      if (!currentFile || data.path === 'src/lib.rs') {
        setCurrentFile(data.path)
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
  }, [sessionId, address])

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

  const downloadAll = () => {
    let allCode = ''
    files.forEach((content, path) => {
      allCode += `\\n\\n=== ${path} ===\\n\\n${content}`
    })
    
    const blob = new Blob([allCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contract-project.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#2d2d30', borderBottom: '1px solid #3e3e42', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#cccccc', fontSize: '1.25rem' }}>
              Generation Studio - Session #{sessionId.substring(0, 8)}
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#858585', fontSize: '0.875rem' }}>
              {status} {progress > 0 && `(${progress}%)`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {files.size > 0 && (
              <>
                <button
                  onClick={downloadCode}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: '#0e639c', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                >
                  Download Current
                </button>
                <button
                  onClick={downloadAll}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: '#0e639c', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                >
                  Download All
                </button>
              </>
            )}
            {isReady && (
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                style={{ 
                  padding: '0.5rem 1.5rem', 
                  fontSize: '0.875rem', 
                  backgroundColor: isDeploying ? '#475569' : '#16825d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  cursor: isDeploying ? 'not-allowed' : 'pointer', 
                  fontWeight: '600' 
                }}
              >
                {isDeploying ? 'Deploying...' : 'Deploy to Blockchain'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: '#3e3e42', color: '#cccccc', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        {!isComplete && (
          <div style={{ marginTop: '1rem', backgroundColor: '#3e3e42', borderRadius: '0.25rem', height: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#0e639c', transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      {/* Main content - Resizable panels */}
      <Split
        sizes={[20, 50, 30]}
        minSize={100}
        gutterSize={8}
        gutterStyle={() => ({ backgroundColor: '#3e3e42' })}
        style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
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
            language="rust"
            theme="vs-dark"
            value={files.get(currentFile) || '// Waiting for code generation...'}
            options={{
              readOnly: true,
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true
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

      {/* IPFS Info */}
      {ipfsHash && (
        <div style={{ backgroundColor: '#2d2d30', borderTop: '1px solid #3e3e42', padding: '0.75rem 1.5rem' }}>
          <span style={{ color: '#858585', fontSize: '0.875rem' }}>
            IPFS: <a href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0e639c' }}>{ipfsHash}</a>
          </span>
        </div>
      )}
    </div>
  )
}

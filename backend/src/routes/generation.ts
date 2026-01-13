import { Router, Request, Response } from 'express'
import { streamManager } from '../services/generation/streamManager'
import { CodeGenerator } from '../gemini/generator'
import { MockCodeGenerator, getMockCompilationResult, getMockTests } from '../gemini/mockGenerator'
import { generateProjectFiles } from '../services/generation/projectGenerator'
import { compileAndHeal } from '../services/generation/healingLoop'
import { generateTests } from '../services/generation/errorFixer'
import { IPFSStorage } from '../ipfs/storage'
import { config } from '../config'
import fs from 'fs'

const MOCK_MODE = process.env.MOCK_MODE === 'true'
const codeGenerator = MOCK_MODE ? null : new CodeGenerator(config.geminiApiKey)
const mockGenerator = MOCK_MODE ? new MockCodeGenerator() : null
const ipfsStorage = new IPFSStorage(config.pinataApiKey, config.pinataSecretKey)

const router = Router()

// SSE endpoint for real-time generation
router.get('/generate-stream/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params
  const { userId } = req.query

  if (!userId) {
    res.status(400).json({ error: 'userId required' })
    return
  }

  // Add client to stream manager
  streamManager.addClient(sessionId, res, userId as string)

  // Handle client disconnect
  req.on('close', () => {
    streamManager.removeClient(sessionId)
  })
})

// Start generation
router.post('/generate-start', async (req: Request, res: Response) => {
  const { sessionId, description, category } = req.body

  if (!sessionId || !description || !category) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  // Return immediately - generation happens in background
  res.json({ success: true, sessionId })

  // Run generation in background
  runGeneration(sessionId, description, category).catch(error => {
    console.error('Generation error:', error)
    streamManager.sendError(sessionId, error.message)
  })
})

async function runGeneration(sessionId: string, description: string, category: string) {
  try {
    let contractCode: string;

    if (MOCK_MODE) {
      // Use mock generator
      console.log('🎭 MOCK MODE: Using simulated generation');
      streamManager.sendTerminal(sessionId, '🎭 MOCK MODE ENABLED - Simulating generation...\\n\\n');
      
      // Mock generator handles its own status updates
      contractCode = await mockGenerator!.generateContract(description, category, streamManager, sessionId);
    } else {
      // Use real Gemini API
      streamManager.sendStatus(sessionId, 'Generating contract code with AI...', 10);
      streamManager.sendTerminal(sessionId, '> Starting AI code generation...\\n');
      contractCode = await codeGenerator!.generateContract(description, category);
      streamManager.sendStatus(sessionId, 'Code generated successfully', 30);
    }

    streamManager.sendTerminal(sessionId, `Generated ${contractCode.split('\\n').length} lines of code\\n`)

    // Step 2: Create project files
    streamManager.sendStatus(sessionId, 'Creating project structure...', 40)
    streamManager.sendTerminal(sessionId, '\\n> Creating project files...\\n')

    const projectFiles = generateProjectFiles(contractCode, 'contract', description, category)
    
    // Send all files to frontend
    for (const file of projectFiles) {
      streamManager.sendFile(sessionId, file.path, file.content)
      streamManager.sendTerminal(sessionId, `  Created ${file.path}\\n`)
    }

    // MOCK MODE: Skip compilation and complete immediately
    if (MOCK_MODE) {
      streamManager.sendStatus(sessionId, 'Mock mode - skipping compilation', 80)
      streamManager.sendTerminal(sessionId, '\\nMOCK MODE: Skipping compilation and IPFS upload\\n')
      streamManager.sendTerminal(sessionId, 'Contract ready for deployment!\\n')
      
      streamManager.sendComplete(sessionId, {
        success: true,
        code: contractCode,
        wasmPath: '/mock/contract.wasm',
        abiPath: '/mock/contract.abi.json',
        ipfsHash: 'QmMockHash123456789',
        attempts: 1
      })
      return
    }

    // MVP: Skip compilation - users compile locally
    // This removes the need for Rust/mxpy installation on the backend
    streamManager.sendStatus(sessionId, 'Code generation complete!', 80)
    streamManager.sendTerminal(sessionId, '\nContract code generated successfully!\n')
    streamManager.sendTerminal(sessionId, 'Download the code and compile locally with: sc-meta all build\n')
    streamManager.sendTerminal(sessionId, 'Then deploy with: mxpy contract deploy --bytecode=output/contract.wasm\n')

    // Upload to IPFS (still useful for on-chain reference)
    streamManager.sendStatus(sessionId, 'Uploading to IPFS...', 85)
    streamManager.sendTerminal(sessionId, '\n> Uploading code to IPFS...\n')

    const ipfsHash = await ipfsStorage.uploadCode(contractCode, {
      generationId: Date.now(),
      description,
      category,
      creator: 'user'
    })

    streamManager.sendTerminal(sessionId, `Uploaded to IPFS: ${ipfsHash}\n`)

    // Complete
    streamManager.sendStatus(sessionId, 'Ready to download!', 100)
    streamManager.sendTerminal(sessionId, '\nGeneration complete! Download your contract and compile locally.\n')

    streamManager.sendComplete(sessionId, {
      success: true,
      code: contractCode,
      wasmPath: null, // No WASM - user compiles locally
      abiPath: null,
      ipfsHash,
      attempts: 1
    })

  } catch (error: any) {
    console.error('Generation error:', error)
    streamManager.sendError(sessionId, error.message)
  }
}

// Deploy contract
router.post('/deploy', async (req: Request, res: Response) => {
  const { sessionId, wasmPath } = req.body

  if (!sessionId || !wasmPath) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  try {
    // TODO: Implement actual deployment
    // For now, just return mock data
    res.json({
      success: true,
      contractAddress: 'erd1qqqqqqqqqqqqqpgq...',
      txHash: '0x...'
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get user generations (for history)
router.get('/user/:address', async (req: Request, res: Response) => {
  const { address } = req.params
  
  try {
    // In production, query from database or indexer
    // For now, return empty array
    res.json({ generations: [] })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router

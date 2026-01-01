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

    const projectFiles = generateProjectFiles(contractCode, 'contract')
    
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

    // Step 3: Compile and self-heal
    streamManager.sendStatus(sessionId, 'Compiling contract...', 50)

    const healResult = await compileAndHeal(contractCode, streamManager, sessionId, 3)

    if (!healResult.success) {
      streamManager.sendStatus(sessionId, 'Compilation failed', 100)
      streamManager.sendComplete(sessionId, {
        success: false,
        error: 'Failed to compile after 3 attempts',
        errors: healResult.errors
      })
      return
    }

    // Step 4: Generate tests
    streamManager.sendStatus(sessionId, 'Generating tests...', 70)
    streamManager.sendTerminal(sessionId, '\\n> Generating integration tests...\\n')

    try {
      const tests = await generateTests(healResult.code)
      streamManager.sendFile(sessionId, 'tests/integration_test.rs', tests)
      streamManager.sendTerminal(sessionId, '✓ Generated tests\\n')
    } catch (error) {
      streamManager.sendTerminal(sessionId, '⚠ Test generation failed (optional)\\n', false)
    }

    // Step 5: Upload to IPFS
    streamManager.sendStatus(sessionId, 'Uploading to IPFS...', 85)
    streamManager.sendTerminal(sessionId, '\\n> Uploading code to IPFS...\\n')

    const wasmBuffer = fs.readFileSync(healResult.wasmPath!)
    const ipfsHash = await ipfsStorage.uploadCode(wasmBuffer.toString(), {
      generationId: Date.now(),
      description,
      category,
      creator: 'user'
    })

    streamManager.sendTerminal(sessionId, `✓ Uploaded to IPFS: ${ipfsHash}\\n`)

    // Step 6: Complete
    streamManager.sendStatus(sessionId, 'Ready to deploy!', 100)
    streamManager.sendTerminal(sessionId, '\\n✓ Contract ready for deployment!\\n')

    streamManager.sendComplete(sessionId, {
      success: true,
      code: healResult.code,
      wasmPath: healResult.wasmPath,
      abiPath: healResult.abiPath,
      ipfsHash,
      attempts: healResult.attempts
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

export default router

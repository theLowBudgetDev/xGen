// Main Backend Service Entry Point

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config';
import { CodeGenerator } from './gemini/generator';
import { IPFSStorage } from './ipfs/storage';
import { EventListener } from './multiversx/listener';
import { OracleCallback } from './multiversx/oracle';
import generationRoutes from './routes/generation';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour per IP
  message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

// Routes
app.use('/api/generation', generationRoutes);

// Initialize services
let codeGenerator: CodeGenerator;
let ipfsStorage: IPFSStorage;
let eventListener: EventListener;
let oracle: OracleCallback;

async function initializeServices() {
  console.log('🚀 Initializing backend services...');

  try {
    // Validate configuration
    validateConfig();

    // Initialize Gemini
    codeGenerator = new CodeGenerator(config.geminiApiKey);
    console.log('✅ Gemini AI initialized');

    // Initialize IPFS
    ipfsStorage = new IPFSStorage(config.pinataApiKey, config.pinataSecretKey);
    const ipfsConnected = await ipfsStorage.testConnection();
    if (!ipfsConnected) {
      throw new Error('Failed to connect to Pinata');
    }

    // Initialize MultiversX Event Listener
    if (config.contractAddress) {
      eventListener = new EventListener(
        config.multiversxApiUrl,
        config.contractAddress
      );
      const mvxConnected = await eventListener.testConnection();
      if (!mvxConnected) {
        console.warn('⚠️  MultiversX connection failed, event listener disabled');
      } else {
        console.log('✅ MultiversX event listener initialized');
      }

      // Initialize Oracle (if wallet PEM exists)
      try {
        oracle = new OracleCallback(
          config.multiversxApiUrl,
          config.contractAddress,
          config.walletPemPath,
          'D' // Devnet
        );
        const oracleReady = await oracle.testOracle();
        if (oracleReady) {
          console.log('✅ Oracle callback initialized');
          const balance = await oracle.getBalance();
          console.log(`   Oracle balance: ${balance}`);
        }
      } catch (error: any) {
        console.warn('⚠️  Oracle initialization failed:', error.message);
        console.warn('   Event listener will run but cannot complete generations');
      }
    } else {
      console.warn('⚠️  No contract address configured, MultiversX integration disabled');
    }

    console.log('✅ All services initialized');

  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

// API Routes

app.get('/', (req, res) => {
  res.json({
    service: 'Contract Generator Backend',
    status: 'running',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test endpoint for code generation
app.post('/api/test-generate', async (req, res) => {
  try {
    const { description, category } = req.body;

    if (!description || !category) {
      return res.status(400).json({ error: 'Missing description or category' });
    }

    console.log(`Test generation request: ${description.substring(0, 50)}...`);

    // Generate code
    const code = await codeGenerator.generateContract(description, category);

    // Upload to IPFS
    const cid = await ipfsStorage.uploadCode(code, {
      generationId: Date.now(),
      description,
      category,
      creator: 'test'
    });

    res.json({
      success: true,
      cid,
      codeLength: code.length,
      preview: code.substring(0, 200) + '...'
    });

  } catch (error: any) {
    console.error('Test generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get code from IPFS
app.get('/api/code/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const data = await ipfsStorage.retrieveCode(cid);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function start() {
  await initializeServices();

  app.listen(config.port, () => {
    console.log(`\n🚀 Backend service running on port ${config.port}`);
    console.log(`📡 API: http://localhost:${config.port}`);
    console.log(`🏥 Health: http://localhost:${config.port}/health`);
    console.log(`\n✨ Ready to generate contracts!\n`);
  });

  // Start event listener if configured
  if (eventListener && oracle) {
    console.log('👂 Starting event listener...\n');
    
    eventListener.startListening(async (event) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📨 NEW GENERATION REQUEST`);
      console.log(`${'='.repeat(60)}`);
      console.log(`   Generation ID: ${event.generationId}`);
      console.log(`   Creator: ${event.creator}`);
      console.log(`   Category: ${event.category}`);
      console.log(`   Description: ${event.description.substring(0, 100)}...`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        // Step 1: Generate code with Gemini
        console.log('🤖 Generating Rust code with Gemini AI...');
        const code = await codeGenerator.generateContract(
          event.description,
          event.category
        );

        // Step 2: Upload to IPFS
        console.log('📤 Uploading code to IPFS...');
        const cid = await ipfsStorage.uploadCode(code, {
          generationId: event.generationId,
          description: event.description,
          category: event.category,
          creator: event.creator
        });

        // Step 3: Call oracle to complete generation
        console.log('📡 Calling smart contract oracle...');
        const txHash = await oracle.completeGeneration(
          event.generationId,
          cid,
          true // success
        );

        console.log(`\n✅ GENERATION COMPLETED SUCCESSFULLY`);
        console.log(`   IPFS CID: ${cid}`);
        console.log(`   TX Hash: ${txHash}`);
        console.log(`   Code Size: ${code.length} bytes\n`);

      } catch (error: any) {
        console.error(`\n❌ GENERATION FAILED`);
        console.error(`   Error: ${error.message}\n`);

        // Call oracle with failure
        try {
          await oracle.completeGeneration(
            event.generationId,
            '',
            false // failure
          );
          console.log('   Failure reported to contract\n');
        } catch (oracleError: any) {
          console.error('   Failed to report failure to contract:', oracleError.message);
        }
      }
    }, config.eventPollingInterval);
  }
}

start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

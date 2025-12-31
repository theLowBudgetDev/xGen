// Configuration Management

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Gemini AI
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // Pinata IPFS
  pinataApiKey: process.env.PINATA_API_KEY || '',
  pinataSecretKey: process.env.PINATA_SECRET_KEY || '',

  // MultiversX
  multiversxApiUrl: process.env.MULTIVERSX_API_URL || 'https://devnet-api.multiversx.com',
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  walletPemPath: process.env.WALLET_PEM_PATH || './wallet.pem',

  // Server
  port: parseInt(process.env.PORT || '3000', 10),

  // Polling
  eventPollingInterval: 6000, // 6 seconds (1 block)
};

export function validateConfig(): void {
  const required = [
    'geminiApiKey',
    'pinataApiKey',
    'pinataSecretKey',
    'contractAddress'
  ];

  const missing = required.filter(key => !config[key as keyof typeof config]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Configuration validated');
}

// Test script to list available Gemini models
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    console.log('Fetching available models...\n');
    
    // Try to list models
    const models = await genAI.listModels();
    
    console.log('Available models:');
    console.log('================\n');
    
    for (const model of models) {
      console.log(`Model: ${model.name}`);
      console.log(`Display Name: ${model.displayName}`);
      console.log(`Description: ${model.description}`);
      console.log(`Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('---\n');
    }
  } catch (error: any) {
    console.error('Error listing models:', error.message);
    console.error('Full error:', error);
  }
}

listModels();

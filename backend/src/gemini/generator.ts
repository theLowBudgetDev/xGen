// Gemini AI Code Generator

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateContractPrompt } from './prompts';

export class CodeGenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 32768, // Increased to allow longer contracts
      }
    });
  }

  async generateContract(description: string, category: string): Promise<string> {
    console.log(`Generating contract for: ${description.substring(0, 50)}...`);
    
    const prompt = generateContractPrompt(description, category);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let code = response.text();
      
      // Extract code from markdown if present
      code = this.extractRustCode(code);
      
      // Basic validation
      if (!code.includes('#![no_std]')) {
        throw new Error('Generated code missing #![no_std]');
      }
      
      if (!code.includes('#[multiversx_sc::contract]')) {
        throw new Error('Generated code missing contract attribute');
      }
      
      console.log(`[SUCCESS] Code generated successfully (${code.length} bytes)`);
      return code;
      
    } catch (error) {
      console.error('[ERROR] Code generation failed:', error);
      throw error;
    }
  }

  private extractRustCode(text: string): string {
    // Remove markdown code blocks
    const rustCodeMatch = text.match(/```rust\n([\s\S]*?)\n```/);
    if (rustCodeMatch) {
      return rustCodeMatch[1];
    }
    
    const codeMatch = text.match(/```\n([\s\S]*?)\n```/);
    if (codeMatch) {
      return codeMatch[1];
    }
    
    // If no code blocks, return as-is
    return text.trim();
  }

  /**
   * Validate generated code (basic checks)
   */
  validateCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!code.includes('#![no_std]')) {
      errors.push('Missing #![no_std] declaration');
    }

    if (!code.includes('#[multiversx_sc::contract]')) {
      errors.push('Missing contract attribute');
    }

    if (!code.includes('#[init]')) {
      errors.push('Missing init function');
    }

    if (code.length < 100) {
      errors.push('Code too short, likely incomplete');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

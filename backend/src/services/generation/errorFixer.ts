import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from '../../config'

const genAI = new GoogleGenerativeAI(config.geminiApiKey)

export async function fixCompilationErrors(
  code: string,
  errors: string,
  attempt: number
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are an expert Rust developer specializing in MultiversX smart contracts.

TASK: Fix the compilation errors in this Rust smart contract code.

COMPILATION ERRORS:
${errors}

CURRENT CODE:
\`\`\`rust
${code}
\`\`\`

INSTRUCTIONS:
1. Analyze the compilation errors carefully
2. Fix ONLY the errors - do not modify working code
3. Maintain the contract's functionality
4. Use MultiversX SC framework v0.64.0 conventions
5. Return ONLY the fixed Rust code, no explanations or markdown

COMMON FIXES FOR MULTIVERSX CONTRACTS:
- Replace TypeAbi derive with #[type_abi] attribute
- Ensure storage mappers have #[storage_mapper("name")] and return proper types
- Events must have exactly 1 non-indexed data field (add #[indexed] to others)
- Use ManagedBuffer instead of String/&str
- Use Self::Api for generic type parameters in structs
- Ensure all imports are present (multiversx_sc::imports!(), multiversx_sc::derive_imports!())
- Storage mapper functions should not have &self in the signature definition

ATTEMPT: ${attempt}/2

Return the complete fixed code:`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Extract code from markdown if present
    const codeMatch = text.match(/\`\`\`rust\n([\s\S]*?)\n\`\`\`/)
    if (codeMatch) {
      return codeMatch[1]
    }

    // If no markdown, return as is (assume it's code)
    return text.trim()
  } catch (error) {
    console.error('Error fixing compilation errors:', error)
    throw error
  }
}

export async function generateTests(code: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `Generate comprehensive integration tests for this MultiversX smart contract.

CONTRACT CODE:
\`\`\`rust
${code}
\`\`\`

Generate tests using multiversx-sc-scenario framework that:
1. Test all public endpoints
2. Test edge cases and error conditions
3. Test access control
4. Test state changes

Return ONLY the test code for tests/integration_test.rs:`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    const codeMatch = text.match(/\`\`\`rust\n([\s\S]*?)\n\`\`\`/)
    if (codeMatch) {
      return codeMatch[1]
    }

    return text.trim()
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error
  }
}

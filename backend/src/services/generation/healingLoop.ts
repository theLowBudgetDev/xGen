import { rustCompiler, CompileResult } from './compiler'
import { fixCompilationErrors } from './errorFixer'
import { StreamManager } from './streamManager'

export interface HealResult {
  success: boolean
  code: string
  wasmPath?: string
  abiPath?: string
  errors?: string
  attempts: number
}

export async function compileAndHeal(
  code: string,
  stream: StreamManager,
  streamId: string,
  maxAttempts: number = 3
): Promise<HealResult> {
  let currentCode = code
  let lastErrors = ''

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Send compile start event
    stream.sendCompileStart(streamId)
    stream.sendTerminal(streamId, `\n> Compiling (attempt ${attempt}/${maxAttempts})...\n`)

    // Compile the code
    const result: CompileResult = await rustCompiler.compile(currentCode, 'contract')

    if (result.success) {
      // Compilation successful!
      stream.sendCompileResult(streamId, true, undefined, result.warnings)
      stream.sendTerminal(streamId, '✓ Compilation successful!\n', false)

      if (result.warnings) {
        stream.sendTerminal(streamId, `\nWarnings:\n${result.warnings}\n`, false)
      }

      return {
        success: true,
        code: currentCode,
        wasmPath: result.wasmPath,
        abiPath: result.abiPath,
        attempts: attempt
      }
    }

    // Compilation failed
    lastErrors = result.errors || 'Unknown compilation error'
    stream.sendCompileResult(streamId, false, lastErrors)
    stream.sendTerminal(streamId, `✗ Compilation failed\n\n${lastErrors}\n`, true)

    // If this was the last attempt, give up
    if (attempt === maxAttempts) {
      stream.sendTerminal(streamId, `\n✗ Max attempts (${maxAttempts}) reached. Unable to fix errors.\n`, true)
      break
    }

    // Try to fix the errors with AI
    stream.sendFixing(streamId, attempt, maxAttempts)
    stream.sendTerminal(streamId, `\n> AI analyzing errors and generating fix...\n`)

    try {
      currentCode = await fixCompilationErrors(currentCode, lastErrors, attempt)
      stream.sendTerminal(streamId, `✓ Generated fix for attempt ${attempt + 1}\n`)
      
      // Send the fixed code to frontend
      stream.sendFile(streamId, 'src/lib.rs', currentCode)
    } catch (error) {
      stream.sendTerminal(streamId, `✗ Error generating fix: ${error}\n`, true)
      break
    }
  }

  // All attempts failed
  return {
    success: false,
    code: currentCode,
    errors: lastErrors,
    attempts: maxAttempts
  }
}

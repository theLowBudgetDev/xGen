import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface CompileResult {
  success: boolean
  errors?: string
  warnings?: string
  output: string
  wasmPath?: string
  abiPath?: string
}

export interface CompilationError {
  file: string
  line: number
  column: number
  message: string
  code: string
}

export class RustCompiler {
  private tempDir: string

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }
  }

  async compile(code: string, projectName: string = 'contract'): Promise<CompileResult> {
    const projectDir = await this.createProject(code, projectName)
    
    try {
      const result = await this.runBuild(projectDir)
      return result
    } finally {
      // Clean up temp directory after compilation
      // await this.cleanup(projectDir)
    }
  }

  async createProject(code: string, projectName: string): Promise<string> {
    const timestamp = Date.now()
    const projectDir = path.join(this.tempDir, `${projectName}-${timestamp}`)

    // Create project structure
    fs.mkdirSync(projectDir, { recursive: true })
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true })
    fs.mkdirSync(path.join(projectDir, 'meta'), { recursive: true })

    // Write Cargo.toml
    const cargoToml = this.generateCargoToml(projectName)
    fs.writeFileSync(path.join(projectDir, 'Cargo.toml'), cargoToml)

    // Write main contract code
    fs.writeFileSync(path.join(projectDir, 'src', 'lib.rs'), code)

    // Write meta/Cargo.toml
    const metaCargoToml = this.generateMetaCargoToml(projectName)
    fs.writeFileSync(path.join(projectDir, 'meta', 'Cargo.toml'), metaCargoToml)

    // Write meta/src/main.rs
    const metaMain = this.generateMetaMain()
    fs.mkdirSync(path.join(projectDir, 'meta', 'src'), { recursive: true })
    fs.writeFileSync(path.join(projectDir, 'meta', 'src', 'main.rs'), metaMain)

    return projectDir
  }

  async runBuild(projectDir: string): Promise<CompileResult> {
    try {
      // Run mxpy contract build
      const { stdout, stderr } = await execAsync('mxpy contract build', {
        cwd: projectDir,
        env: { ...process.env, RUSTFLAGS: '-C link-arg=-s' }
      })

      const output = stdout + stderr

      // Check if build was successful
      const wasmPath = path.join(projectDir, 'output', 'contract.wasm')
      const abiPath = path.join(projectDir, 'output', 'contract.abi.json')

      if (fs.existsSync(wasmPath)) {
        // Extract warnings if any
        const warnings = this.extractWarnings(output)

        return {
          success: true,
          output,
          warnings,
          wasmPath,
          abiPath: fs.existsSync(abiPath) ? abiPath : undefined
        }
      } else {
        // Build failed
        const errors = this.extractErrors(output)
        return {
          success: false,
          errors,
          output
        }
      }
    } catch (error: any) {
      // Compilation error
      const output = error.stdout + error.stderr
      const errors = this.extractErrors(output)

      return {
        success: false,
        errors,
        output
      }
    }
  }

  parseErrors(stderr: string): CompilationError[] {
    const errors: CompilationError[] = []
    const errorRegex = /error\[E\d+\]: (.+)\n\s+-->\s+(.+):(\d+):(\d+)/g
    
    let match
    while ((match = errorRegex.exec(stderr)) !== null) {
      errors.push({
        message: match[1],
        file: match[2],
        line: parseInt(match[3]),
        column: parseInt(match[4]),
        code: match[0]
      })
    }

    return errors
  }

  private extractErrors(output: string): string {
    // Extract error messages from cargo output
    const lines = output.split('\n')
    const errorLines: string[] = []
    let inError = false

    for (const line of lines) {
      if (line.includes('error[E') || line.includes('error:')) {
        inError = true
      }
      if (inError) {
        errorLines.push(line)
        if (line.trim() === '' && errorLines.length > 0) {
          inError = false
        }
      }
    }

    return errorLines.join('\n')
  }

  private extractWarnings(output: string): string | undefined {
    const lines = output.split('\n')
    const warningLines: string[] = []
    let inWarning = false

    for (const line of lines) {
      if (line.includes('warning:')) {
        inWarning = true
      }
      if (inWarning) {
        warningLines.push(line)
        if (line.trim() === '' && warningLines.length > 0) {
          inWarning = false
        }
      }
    }

    return warningLines.length > 0 ? warningLines.join('\n') : undefined
  }

  private generateCargoToml(projectName: string): string {
    return `[package]
name = "${projectName}"
version = "0.0.0"
authors = ["AI Contract Generator"]
edition = "2021"
publish = false

[lib]
path = "src/lib.rs"

[dependencies.multiversx-sc]
version = "0.64.0"

[dev-dependencies.multiversx-sc-scenario]
version = "0.64.0"
`
  }

  private generateMetaCargoToml(projectName: string): string {
    return `[package]
name = "${projectName}-meta"
version = "0.0.0"
authors = ["AI Contract Generator"]
edition = "2021"
publish = false

[dependencies.multiversx-sc-meta]
version = "0.64.0"

[dependencies.${projectName}]
path = ".."
`
  }

  private generateMetaMain(): string {
    return `fn main() {
    multiversx_sc_meta::cli_main::<contract::AbiProvider>();
}
`
  }

  private async cleanup(projectDir: string) {
    try {
      fs.rmSync(projectDir, { recursive: true, force: true })
    } catch (error) {
      console.error('Error cleaning up project directory:', error)
    }
  }
}

export const rustCompiler = new RustCompiler()

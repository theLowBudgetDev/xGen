import { Response } from 'express'

export interface SSEClient {
  id: string
  res: Response
  userId: string
}

export class StreamManager {
  private clients: Map<string, SSEClient> = new Map()

  addClient(id: string, res: Response, userId: string) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

    this.clients.set(id, { id, res, userId })

    // Send initial connection event
    this.send(id, { type: 'connected', message: 'Stream connected' })
  }

  removeClient(id: string) {
    const client = this.clients.get(id)
    if (client) {
      client.res.end()
      this.clients.delete(id)
    }
  }

  send(id: string, data: any) {
    const client = this.clients.get(id)
    if (client) {
      try {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`)
      } catch (error) {
        console.error(`Error sending to client ${id}:`, error)
        this.removeClient(id)
      }
    }
  }

  sendStatus(id: string, message: string, progress?: number) {
    this.send(id, { type: 'status', message, progress })
  }

  sendFile(id: string, path: string, content: string) {
    this.send(id, { type: 'file', path, content })
  }

  sendCodeChunk(id: string, file: string, chunk: string, line: number) {
    this.send(id, { type: 'code_chunk', file, chunk, line })
  }

  sendTerminal(id: string, output: string, isError: boolean = false) {
    this.send(id, { type: 'terminal', output, isError })
  }

  sendCompileStart(id: string) {
    this.send(id, { type: 'compile_start' })
  }

  sendCompileResult(id: string, success: boolean, errors?: string, warnings?: string) {
    this.send(id, { type: 'compile_result', success, errors, warnings })
  }

  sendFixing(id: string, attempt: number, maxAttempts: number) {
    this.send(id, { type: 'fixing', attempt, maxAttempts })
  }

  sendComplete(id: string, data: any) {
    this.send(id, { type: 'complete', data })
    // Don't close connection yet - let client close it
  }

  sendError(id: string, error: string) {
    this.send(id, { type: 'error', error })
  }

  getClient(id: string): SSEClient | undefined {
    return this.clients.get(id)
  }

  hasClient(id: string): boolean {
    return this.clients.has(id)
  }
}

// Global instance
export const streamManager = new StreamManager()

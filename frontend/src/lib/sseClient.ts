export class SSEClient {
  private eventSource: EventSource | null = null
  private sessionId: string
  private callbacks: Map<string, Function> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  connect(userId: string) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const url = `${apiUrl}/api/generation/generate-stream/${this.sessionId}?userId=${userId}`

    console.log('Connecting to SSE:', url)

    try {
      this.eventSource = new EventSource(url)

      this.eventSource.onopen = () => {
        console.log('SSE connection opened')
        this.reconnectAttempts = 0
      }

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('SSE message:', data.type, data)
          
          const callback = this.callbacks.get(data.type)
          if (callback) {
            callback(data)
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      }

      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error)
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          const callback = this.callbacks.get('status')
          if (callback) {
            callback({ 
              message: `Connection lost. Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
              progress: 0
            })
          }
          
          this.eventSource?.close()
          setTimeout(() => this.connect(userId), 2000)
        } else {
          const errorCallback = this.callbacks.get('error')
          if (errorCallback) {
            errorCallback({ 
              error: 'Connection failed. Please check if backend is running at ' + apiUrl 
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to create EventSource:', error)
      const callback = this.callbacks.get('error')
      if (callback) {
        callback({ error: 'Failed to connect to backend. Is it running?' })
      }
    }
  }

  on(event: string, callback: Function) {
    this.callbacks.set(event, callback)
  }

  close() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }
}

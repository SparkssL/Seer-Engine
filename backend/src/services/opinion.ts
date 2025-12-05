import { spawn } from 'child_process'
import path from 'path'
import type { Market, TradeExecution } from '../types.js'

// Interface to communicate with Python Opinion CLOB SDK service
export class OpinionService {
  private pythonProcess: ReturnType<typeof spawn> | null = null
  private isConnected = false
  private messageQueue: Map<string, {
    resolve: (value: any) => void
    reject: (error: Error) => void
  }> = new Map()

  async getBalance(): Promise<{ available: number; symbol: string }> {
    try {
      const response = await this.sendCommand('get_balance', {})
      return {
        available: Number(response?.available || 0),
        symbol: response?.symbol || 'UNKNOWN',
      }
    } catch (error) {
      console.error('[Opinion] Failed to get balance:', error)
      return { available: 0, symbol: 'UNKNOWN' }
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonPath = path.join(process.cwd(), '..', 'python-trader', 'main.py')
      
      console.log('[Opinion] Starting Python trader service...')
      
      // Use python3 explicitly (required on macOS and modern Linux)
      this.pythonProcess = spawn('python3', [pythonPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      })

      this.pythonProcess.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n').filter((l: string) => l.trim())
        for (const line of lines) {
          try {
            const message = JSON.parse(line)
            this.handleMessage(message)
          } catch {
            console.log('[Opinion Python]', line)
          }
        }
      })

      this.pythonProcess.stderr?.on('data', (data) => {
        console.error('[Opinion Python Error]', data.toString())
      })

      this.pythonProcess.on('error', (error) => {
        console.error('[Opinion] Failed to start Python service:', error)
        reject(error)
      })

      this.pythonProcess.on('close', (code) => {
        console.log(`[Opinion] Python service exited with code ${code}`)
        this.isConnected = false
      })

      // Wait for ready signal
      setTimeout(() => {
        this.isConnected = true
        resolve()
      }, 2000)
    })
  }

  private handleMessage(message: any): void {
    const { id, type, data, error } = message

    if (id && this.messageQueue.has(id)) {
      const { resolve, reject } = this.messageQueue.get(id)!
      this.messageQueue.delete(id)

      if (error) {
        reject(new Error(error))
      } else {
        resolve(data)
      }
    }

    if (type === 'ready') {
      this.isConnected = true
      console.log('[Opinion] Python service ready')
    }
  }

  private sendCommand(command: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.pythonProcess || !this.isConnected) {
        const error = new Error('Opinion service not connected. Ensure Python trader is running and Opinion API credentials are configured.')
        console.error('[Opinion] Service not connected')
        reject(error)
        return
      }

      const id = Math.random().toString(36).substring(7)
      const message = JSON.stringify({ id, command, params }) + '\n'

      this.messageQueue.set(id, { resolve, reject })

      this.pythonProcess.stdin?.write(message)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.messageQueue.has(id)) {
          this.messageQueue.delete(id)
          reject(new Error('Command timeout'))
        }
      }, 30000)
    })
  }

  async getMarkets(): Promise<Market[]> {
    try {
      const response = await this.sendCommand('get_markets', {})
      return response || []
    } catch (error) {
      console.error('[Opinion] Failed to get markets:', error)
      return []
    }
  }

  async placeOrder(
    marketId: string,
    side: 'YES' | 'NO',
    amount: number,
    price: number
  ): Promise<TradeExecution> {
    const timestamp = new Date().toISOString()
    const tradeId = `trade-${Date.now()}`

    try {
      const response = await this.sendCommand('place_order', {
        marketId,
        side,
        amount,
        price,
      })

      return {
        id: tradeId,
        marketId,
        side,
        amount,
        price,
        status: response?.success ? 'confirmed' : 'failed',
        txHash: response?.txHash,
        timestamp,
      }
    } catch (error) {
      console.error('[Opinion] Failed to place order:', error)
      return {
        id: tradeId,
        marketId,
        side,
        amount,
        price,
        status: 'failed',
        timestamp,
      }
    }
  }

  disconnect(): void {
    if (this.pythonProcess) {
      this.pythonProcess.kill()
      this.pythonProcess = null
    }
    this.isConnected = false
    this.messageQueue.clear()
  }
}


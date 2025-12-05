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
      
      this.pythonProcess = spawn('python', [pythonPath], {
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
        // Return mock data if not connected
        console.log('[Opinion] Service not connected, using mock data')
        resolve(this.getMockResponse(command, params))
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

  private getMockResponse(command: string, params: any): any {
    switch (command) {
      case 'get_markets':
        return this.getMockMarkets()
      case 'place_order':
        return {
          success: true,
          orderId: `order-${Date.now()}`,
          txHash: `0x${Math.random().toString(16).substring(2)}...`,
        }
      default:
        return null
    }
  }

  async getMarkets(): Promise<Market[]> {
    try {
      const response = await this.sendCommand('get_markets', {})
      return response || this.getMockMarkets()
    } catch (error) {
      console.error('[Opinion] Failed to get markets:', error)
      return this.getMockMarkets()
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

  private getMockMarkets(): Market[] {
    return [
      {
        id: '1',
        question: 'Will Bitcoin reach $100,000 by end of 2024?',
        category: 'Crypto',
        volume: 2500000,
        liquidity: 450000,
        status: 'active',
        endDate: '2024-12-31',
        outcomes: [
          { id: '1a', name: 'Yes', probability: 0.42, change24h: 5.2 },
          { id: '1b', name: 'No', probability: 0.58, change24h: -5.2 },
        ],
      },
      {
        id: '2',
        question: 'Who will win the 2024 US Presidential Election?',
        category: 'Politics',
        volume: 15000000,
        liquidity: 2300000,
        status: 'active',
        endDate: '2024-11-05',
        outcomes: [
          { id: '2a', name: 'Trump', probability: 0.52, change24h: 1.8 },
          { id: '2b', name: 'Biden', probability: 0.48, change24h: -1.8 },
        ],
      },
      {
        id: '3',
        question: 'Will the Fed cut rates in September 2024?',
        category: 'Finance',
        volume: 890000,
        liquidity: 120000,
        status: 'active',
        endDate: '2024-09-18',
        outcomes: [
          { id: '3a', name: 'Yes', probability: 0.75, change24h: 3.1 },
          { id: '3b', name: 'No', probability: 0.25, change24h: -3.1 },
        ],
      },
      {
        id: '4',
        question: 'Will Ethereum ETF be approved in 2024?',
        category: 'Crypto',
        volume: 1200000,
        liquidity: 280000,
        status: 'active',
        endDate: '2024-12-31',
        outcomes: [
          { id: '4a', name: 'Yes', probability: 0.68, change24h: 12.4 },
          { id: '4b', name: 'No', probability: 0.32, change24h: -12.4 },
        ],
      },
      {
        id: '5',
        question: 'Will Tesla stock close above $250 this week?',
        category: 'Finance',
        volume: 560000,
        liquidity: 85000,
        status: 'active',
        endDate: '2024-03-22',
        outcomes: [
          { id: '5a', name: 'Yes', probability: 0.35, change24h: -8.2 },
          { id: '5b', name: 'No', probability: 0.65, change24h: 8.2 },
        ],
      },
      {
        id: '6',
        question: 'Will there be a TikTok ban in the US by 2025?',
        category: 'Politics',
        volume: 780000,
        liquidity: 95000,
        status: 'active',
        endDate: '2025-01-01',
        outcomes: [
          { id: '6a', name: 'Yes', probability: 0.28, change24h: 2.1 },
          { id: '6b', name: 'No', probability: 0.72, change24h: -2.1 },
        ],
      },
    ]
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


import express from 'express'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import type { Source } from './types.js'
import { TwitterService } from './services/twitter.js'
import { OpinionService } from './services/opinion.js'
import { AnalyzerService } from './services/analyzer.js'

// Load environment variables
dotenv.config({ path: '../.env' })

const PORT = process.env.BACKEND_PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || ''

// Demo mode - generates mock tweets for testing
const DEMO_MODE =
  (process.env.DEMO_MODE || '').toLowerCase() === 'true' ||
  !TWITTER_API_KEY

const app = express()
const server = createServer(app)
const io = new SocketServer(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
})

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', demoMode: DEMO_MODE })
})

// Initialize services
const twitterService = new TwitterService(TWITTER_API_KEY)
const opinionService = new OpinionService()
let analyzerService: AnalyzerService | null = null

// Demo mode tweet generator
let demoInterval: NodeJS.Timeout | null = null

function startDemoMode(): void {
  if (demoInterval) return
  
  console.log('[Server] Starting demo mode - generating mock tweets')
  
  demoInterval = setInterval(() => {
    const mockTweet = twitterService.generateMockTweet()
    io.emit('tweet', mockTweet)
    
    // Process through analyzer
    if (analyzerService) {
      analyzerService.processTweet(mockTweet)
    }
  }, 15000) // Generate a tweet every 15 seconds
}

function stopDemoMode(): void {
  if (demoInterval) {
    clearInterval(demoInterval)
    demoInterval = null
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`)

  // Send initial markets
  if (analyzerService) {
    socket.emit('markets', analyzerService.getMarkets())
    socket.emit('sessions:history', analyzerService.getHistory())
  }

  // Handle configuration from client
  socket.on('configure', async (config: { sources: Source[] }) => {
    console.log(`[Socket] Configuring with ${config.sources.length} sources`)

    if (DEMO_MODE) {
      // In demo mode, just start generating mock tweets
      startDemoMode()
    } else {
      // Connect to Twitter WebSocket
      await twitterService.connect(config.sources)
    }
  })

  // Handle history filtering
  socket.on('history:filter', (filter: import('./types.js').HistoryFilter) => {
    if (analyzerService) {
      const filtered = analyzerService.getFilteredHistory(filter)
      socket.emit('history:filtered', filtered)
    }
  })

  // Handle analytics request
  socket.on('history:analytics', () => {
    if (analyzerService) {
      const analytics = analyzerService.calculateAnalytics()
      socket.emit('sessions:analytics', analytics)
    }
  })

  // Handle single session detail request
  socket.on('history:get-session', (sessionId: string) => {
    if (analyzerService) {
      const session = analyzerService.getHistory().find(s => s.id === sessionId)
      socket.emit('history:session-detail', session)
    }
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`)

    // If no more clients, stop services
    if (io.sockets.sockets.size === 0) {
      stopDemoMode()
      twitterService.disconnect()
    }
  })
})

// Twitter event handlers
twitterService.on('tweet', (tweet) => {
  console.log(`[Twitter] Received tweet from @${tweet.author.username}`)
  io.emit('tweet', tweet)
  
  // Process through analyzer
  if (analyzerService) {
    analyzerService.processTweet(tweet)
  }
})

twitterService.on('connected', () => {
  console.log('[Twitter] Service connected')
})

twitterService.on('disconnected', () => {
  console.log('[Twitter] Service disconnected')
})

twitterService.on('error', (error) => {
  console.error('[Twitter] Service error:', error)
})

// Start server
async function start(): Promise<void> {
  try {
    console.log('[Server] Initializing services...')
    
    // Connect to Opinion service unless in demo mode
    if (DEMO_MODE) {
      console.log('[Server] Demo mode enabled - skipping Opinion connect (using mock markets/trades)')
    } else {
      await opinionService.connect()
    }
    
    // Initialize analyzer (Opinion service will respond with mock data if not connected)
    analyzerService = new AnalyzerService(
      OPENAI_API_KEY,
      opinionService,
      io
    )
    
    // Load initial markets
    await analyzerService.loadMarkets()
    
    server.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`)
      console.log(`[Server] Demo mode: ${DEMO_MODE ? 'ENABLED' : 'DISABLED'}`)
      console.log(`[Server] Frontend URL: ${FRONTEND_URL}`)
      
      if (!OPENAI_API_KEY) {
        console.warn('[Server] WARNING: OPENAI_API_KEY not set - AI analysis will fail')
      }
      if (!TWITTER_API_KEY) {
        console.warn('[Server] WARNING: TWITTER_API_KEY not set - using demo mode')
      }
    })
  } catch (error) {
    console.error('[Server] Failed to start:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Received SIGTERM, shutting down...')
  stopDemoMode()
  twitterService.disconnect()
  opinionService.disconnect()
  server.close(() => {
    console.log('[Server] Closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT, shutting down...')
  stopDemoMode()
  twitterService.disconnect()
  opinionService.disconnect()
  server.close(() => {
    console.log('[Server] Closed')
    process.exit(0)
  })
})

start()


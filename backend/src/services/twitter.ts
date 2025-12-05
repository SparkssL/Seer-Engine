import WebSocket from 'ws'
import { EventEmitter } from 'events'
import type { Tweet, Source } from '../types.js'

// TwitterAPI.io WebSocket configuration (official endpoint)
const TWITTER_WS_URL = 'wss://ws.twitterapi.io/twitter/tweet/websocket'

// TwitterAPI.io recommends waiting at least 90s before reconnecting
const MIN_RECONNECT_DELAY_MS = 90_000

export class TwitterService extends EventEmitter {
  private ws: WebSocket | null = null
  private apiKey: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnected = false
  private lastSources: Source[] = []

  constructor(apiKey: string) {
    super()
    this.apiKey = apiKey
  }

  async connect(sources: Source[] = []): Promise<void> {
    this.lastSources = sources

    if (!this.apiKey) {
      console.warn('[Twitter] TWITTER_API_KEY missing - cannot connect')
      return
    }

    if (this.ws && this.isConnected) {
      console.log('[Twitter] WebSocket already connected')
      return
    }

    try {
      // Connect with x-api-key header authentication
      this.ws = new WebSocket(TWITTER_WS_URL, {
        headers: {
          'x-api-key': this.apiKey,
        },
      })

      this.ws.on('open', () => {
        console.log('[Twitter] WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.emit('connected')
      })

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(message)
        } catch (error) {
          console.error('[Twitter] Failed to parse message:', error)
        }
      })

      this.ws.on('close', (code, reason) => {
        console.log(
          `[Twitter] WebSocket closed: status_code=${code}, message=${reason.toString()}`
        )
        this.isConnected = false
        this.emit('disconnected')
        this.scheduleReconnect()
      })

      this.ws.on('error', (error) => {
        console.error('[Twitter] WebSocket error:', error)
        this.emit('error', error)
      })
    } catch (error) {
      console.error('[Twitter] Connection failed:', error)
      this.scheduleReconnect()
    }
  }

  private handleMessage(message: any): void {
    const eventType = message.event_type

    switch (eventType) {
      case 'connected':
        this.isConnected = true
        this.reconnectAttempts = 0
        console.log('[Twitter] Connection successful')
        return
      case 'ping':
        this.handlePing(message)
        return
      case 'tweet':
        this.handleTweetBatch(message)
        return
      default:
        console.log('[Twitter] Ignoring message type:', eventType ?? message.type)
    }
  }

  private handlePing(message: { timestamp?: number }): void {
    if (!message.timestamp) {
      console.log('[Twitter] ping received (no timestamp)')
      return
    }

    const currentTimeMs = Date.now()
    const diffMs = currentTimeMs - message.timestamp
    const diffSeconds = diffMs / 1000
    const timestampStr = new Date(message.timestamp).toISOString()
    console.log(
      `[Twitter] ping: server_ts=${timestampStr} diff=${diffSeconds.toFixed(2)}s`
    )
  }

  private handleTweetBatch(message: any): void {
    const tweets = Array.isArray(message.tweets) ? message.tweets : []

    if (tweets.length === 0) {
      console.warn('[Twitter] tweet event without tweets array')
      return
    }

    tweets.forEach((rawTweet: any) => {
      const parsed = this.parseTweet(rawTweet, message)
      if (parsed) {
        console.log(`[Twitter] New tweet from @${parsed.author.username}`)
        this.emit('tweet', parsed)
      }
    })
  }

  private parseTweet(tweet: any, envelope?: { timestamp?: number }): Tweet | null {
    try {
      const author = tweet.author || tweet.user || {}
      const createdAt =
        tweet.createdAt ||
        tweet.created_at ||
        (envelope?.timestamp ? new Date(envelope.timestamp).toISOString() : undefined)

      if (!tweet.text) {
        return null
      }

      return {
        id: tweet.id || tweet.id_str || `tweet-${Date.now()}`,
        text: tweet.text,
        author: {
          name: author.name || author.display_name || 'Unknown',
          username: author.username || author.screen_name || 'unknown',
          avatar:
            author.profile_image_url_https ||
            author.profile_image_url ||
            author.profileImageUrl,
          verified: author.verified || author.is_blue_verified || false,
        },
        timestamp: createdAt || new Date().toISOString(),
        metrics: {
          likes: tweet.likeCount || tweet.favorite_count || 0,
          retweets: tweet.retweetCount || tweet.retweet_count || 0,
          replies: tweet.replyCount || tweet.reply_count || 0,
        },
      }
    } catch (error) {
      console.error('[Twitter] Failed to parse tweet:', error)
      return null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Twitter] Max reconnection attempts reached')
      this.emit('error', new Error('Max reconnection attempts reached'))
      return
    }

    if (this.reconnectTimer) return

    this.reconnectAttempts++
    const delay = MIN_RECONNECT_DELAY_MS
    console.log(
      `[Twitter] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    )

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect(this.lastSources)
    }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
    this.lastSources = []
  }

  // Generate mock tweets for demo/testing
  generateMockTweet(): Tweet {
    const mockTweets = [
      {
        text: "Breaking: Federal Reserve signals potential rate cuts in upcoming meetings. Markets responding positively.",
        author: { name: "Reuters", username: "Reuters", verified: true }
      },
      {
        text: "Tesla announces record quarterly deliveries, beating analyst expectations by 15%",
        author: { name: "CNBC Now", username: "CNBCnow", verified: true }
      },
      {
        text: "Major crypto exchange reports surge in Bitcoin trading volume. Institutional interest at all-time high.",
        author: { name: "Whale Alert", username: "whale_alert", verified: true }
      },
      {
        text: "Senate passes bipartisan infrastructure bill. Market implications expected across multiple sectors.",
        author: { name: "AP Politics", username: "AP", verified: true }
      },
      {
        text: "Just announced major partnership. This is going to be huge for our ecosystem! 🚀",
        author: { name: "Vitalik Buterin", username: "VitalikButerin", verified: true }
      },
    ]

    const mock = mockTweets[Math.floor(Math.random() * mockTweets.length)]

    return {
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: mock.text,
      author: {
        ...mock.author,
        avatar: undefined,
      },
      timestamp: new Date().toISOString(),
      metrics: {
        likes: Math.floor(Math.random() * 10000),
        retweets: Math.floor(Math.random() * 5000),
        replies: Math.floor(Math.random() * 1000),
      },
    }
  }
}


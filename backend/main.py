from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import asyncio
from config import settings
from services.twitter_service import TwitterService
from services.openai_service import OpenAIService
from services.opinion_service import OpinionService
from services.analyzer_service import AnalyzerService
from models.types import Source, HistoryFilter

# Create FastAPI app
app = FastAPI(title="Seer Engine", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=settings.FRONTEND_URL,
    logger=False,
    engineio_logger=False
)
socket_app = socketio.ASGIApp(sio, app)

# Services (global state)
twitter_service: TwitterService = None
openai_service: OpenAIService = None
opinion_service: OpinionService = None
analyzer_service: AnalyzerService = None
demo_mode_task: asyncio.Task = None

# Health endpoint
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "demoMode": settings.DEMO_MODE or not settings.TWITTER_API_KEY
    }

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    print(f"[Socket] Client connected: {sid}", flush=True)

    # Send initial data
    try:
        if opinion_service:
            markets = opinion_service.get_markets()
            print(f"[Socket] Sending {len(markets)} markets to client {sid}", flush=True)
            await sio.emit('markets', [m.dict() for m in markets], to=sid)
        else:
            print(f"[Socket] No opinion_service available", flush=True)

        if analyzer_service:
            history = analyzer_service.sessions
            print(f"[Socket] Sending {len(history)} session history items to client {sid}", flush=True)
            await sio.emit('sessions:history', [s.dict() for s in history], to=sid)
        else:
            print(f"[Socket] No analyzer_service available", flush=True)
    except Exception as e:
        print(f"[Socket] Error in connect handler: {e}", flush=True)

@sio.event
async def configure(sid, data):
    """Configure Twitter sources"""
    global demo_mode_task, twitter_service

    sources = [Source(**s) for s in data.get('sources', [])]

    # Check if demo mode
    if settings.DEMO_MODE or not settings.TWITTER_API_KEY:
        print("[Server] Starting demo mode...")
        if not demo_mode_task or demo_mode_task.done():
            demo_mode_task = asyncio.create_task(run_demo_mode())
    else:
        # Connect to Twitter
        twitter_service.on_tweet = lambda tweet: asyncio.create_task(
            on_tweet_received(tweet)
        )
        await twitter_service.connect(sources)

@sio.event
async def disconnect(sid):
    print(f"[Socket] Client disconnected: {sid}")

    # Stop demo mode if no more clients
    try:
        clients = list(sio.manager.rooms.get('/', {}).keys())
        if len(clients) == 0:
            if demo_mode_task and not demo_mode_task.done():
                demo_mode_task.cancel()
            if twitter_service:
                await twitter_service.disconnect()
    except Exception as e:
        print(f"[Socket] Disconnect cleanup error: {e}")

@sio.event
async def history_filter(sid, filter_data):
    """Filter session history"""
    if analyzer_service:
        try:
            filter_obj = HistoryFilter(**filter_data)
            filtered = analyzer_service.get_filtered_history(filter_obj)
            await sio.emit('history:filtered', [s.dict() for s in filtered], to=sid)
        except Exception as e:
            print(f"[Socket] History filter error: {e}")

@sio.event
async def history_analytics(sid):
    """Get session analytics"""
    if analyzer_service:
        try:
            analytics = analyzer_service.calculate_analytics()
            await sio.emit('sessions:analytics', analytics.dict(), to=sid)
        except Exception as e:
            print(f"[Socket] Analytics error: {e}")

@sio.event
async def history_get_session(sid, session_id):
    """Get single session detail"""
    if analyzer_service:
        try:
            session = next((s for s in analyzer_service.sessions if s.id == session_id), None)
            await sio.emit('history:session-detail', session.dict() if session else None, to=sid)
        except Exception as e:
            print(f"[Socket] Session detail error: {e}")

# Helper functions
async def on_tweet_received(tweet):
    """Handle incoming tweet"""
    try:
        await sio.emit('tweet', tweet.dict())
        if analyzer_service:
            await analyzer_service.process_tweet(tweet)
    except Exception as e:
        print(f"[Server] Tweet handling error: {e}")

async def run_demo_mode():
    """Generate mock tweets every 15 seconds"""
    try:
        while True:
            await asyncio.sleep(15)
            if twitter_service:
                mock_tweet = twitter_service.generate_mock_tweet()
                await on_tweet_received(mock_tweet)
    except asyncio.CancelledError:
        print("[Server] Demo mode stopped")
    except Exception as e:
        print(f"[Server] Demo mode error: {e}")

# Startup
@app.on_event("startup")
async def startup():
    global twitter_service, openai_service, opinion_service, analyzer_service

    print("[Server] Initializing services...", flush=True)

    # Initialize services
    twitter_service = TwitterService(settings.TWITTER_API_KEY)
    openai_service = OpenAIService(settings.OPENAI_API_KEY)

    if settings.OPINION_API_KEY and settings.OPINION_PRIVATE_KEY and settings.OPINION_MULTISIG_ADDR:
        try:
            opinion_service = OpinionService(
                api_key=settings.OPINION_API_KEY,
                private_key=settings.OPINION_PRIVATE_KEY,
                multi_sig_addr=settings.OPINION_MULTISIG_ADDR,
                rpc_url=settings.OPINION_RPC_URL,
                host=settings.OPINION_HOST,
                chain_id=settings.CHAIN_ID
            )

            # Load markets
            markets = opinion_service.get_markets()
            print(f"[Analyzer] Loaded {len(markets)} markets", flush=True)
        except Exception as e:
            print(f"[Opinion] Failed to initialize: {e}", flush=True)
            opinion_service = None
    else:
        print("[Opinion] Missing credentials, running without trading", flush=True)
        opinion_service = None

    analyzer_service = AnalyzerService(openai_service, opinion_service, sio)

    print(f"[Server] Ready on port {settings.BACKEND_PORT}", flush=True)
    print(f"[Server] Demo mode: {settings.DEMO_MODE or not settings.TWITTER_API_KEY}", flush=True)

# Shutdown
@app.on_event("shutdown")
async def shutdown():
    if twitter_service:
        await twitter_service.disconnect()
    if demo_mode_task and not demo_mode_task.done():
        demo_mode_task.cancel()
    print("[Server] Shutdown complete")

# Run with: uvicorn main:socket_app --host 0.0.0.0 --port 3001 --reload

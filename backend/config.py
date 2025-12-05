from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file explicitly (like python-trader does)
# This ensures .env values are loaded into os.environ before Settings initialization
# Use override=True to ensure .env values take precedence over any existing env vars
load_dotenv(dotenv_path='../.env', override=True)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra='ignore'
    )
    # OpenAI (Required)
    OPENAI_API_KEY: str

    # Twitter (Optional - demo mode if missing)
    TWITTER_API_KEY: Optional[str] = None

    # Opinion Trade (Optional - mock mode if missing)
    OPINION_API_KEY: Optional[str] = None
    OPINION_PRIVATE_KEY: Optional[str] = None
    OPINION_RPC_URL: str = "https://bsc-dataseed.binance.org"
    OPINION_MULTISIG_ADDR: Optional[str] = None

    # Server Config
    BACKEND_PORT: int = 3001
    FRONTEND_URL: str = "http://localhost:3000"
    DEMO_MODE: bool = False

    # Opinion SDK Config
    HOST: Optional[str] = "https://proxy.opinion.trade:8443"  # From .env
    OPINION_HOST: str = "https://proxy.opinion.trade:8443"
    CHAIN_ID: int = 56
    CONDITIONAL_TOKEN_ADDR: str = "0xAD1a38cEc043e70E83a3eC30443dB285ED10D774"
    MULTISEND_ADDR: str = "0x998739BFdAAdde7C933B942a68053933098f9EDa"

settings = Settings()

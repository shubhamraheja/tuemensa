from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+asyncpg://tuemensa:tuemensa@localhost:5432/tuemensa"
    jwt_secret: str = "change_me_in_production"
    jwt_expire_minutes: int = 10080  # 7 days
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8081",  # Expo web dev server
    ]
    port: int = 8000
    environment: str = "development"
    google_maps_api_key: str | None = None
    # A Hugging Face user-access token with Inference Providers permission.
    # Without it, the image worker remains idle.
    huggingface_token: str | None = None
    huggingface_model: str = "black-forest-labs/FLUX.1-schnell"
    # "auto" uses Hugging Face Inference Providers' available-provider fallback.
    huggingface_provider: str = "auto"
    cloudflare_account_id: str | None = None
    cloudflare_workers_ai_token: str | None = None
    cloudflare_workers_ai_model: str = "@cf/bytedance/stable-diffusion-xl-lightning"
    pollinations_api_key: str | None = None
    pollinations_model: str = "flux"
    groq_api_key: str | None = None
    dish_image_generation_enabled: bool = True
    dish_image_batch_size: int = 3
    dish_image_max_dimension: int = 1024
    dish_image_interval_minutes: int = 30


settings = Settings()

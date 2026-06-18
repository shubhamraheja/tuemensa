from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+asyncpg://tuemensa:tuemensa@localhost:5432/tuemensa"
    jwt_secret: str = "change_me_in_production"
    jwt_expire_minutes: int = 10080  # 7 days
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    port: int = 8000
    environment: str = "development"


settings = Settings()

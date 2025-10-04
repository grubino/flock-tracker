import os
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # Database settings
    database_url: str = "sqlite:///./flock_tracker.db"

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # CORS settings
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Security settings
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Application settings
    app_name: str = "Flock Tracker API"
    version: str = "1.0.0"

    # Admin user settings
    admin_password: str = ""

    def get_cors_origins_list(self) -> List[str]:
        """Convert comma-separated CORS origins string to list"""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(',')]


settings = Settings()
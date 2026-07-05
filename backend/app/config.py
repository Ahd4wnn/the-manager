from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App
    app_name: str = "BMW The Manager"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # Security
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"

    # Database
    postgres_user: str = "bmw"
    postgres_password: str = "bmw_password"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "bmw_manager"
    database_url: str = ""

    # First platform admin (seed)
    first_admin_phone: str = "9999999999"
    first_admin_password: str = "admin12345"
    first_admin_name: str = "Platform Admin"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @computed_field
    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

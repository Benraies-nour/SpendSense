from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    groq_api_key: str = ""
    nova_model: str = "openai/gpt-oss-20b"
    azure_di_endpoint: str = ""
    azure_di_key: str = ""
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()



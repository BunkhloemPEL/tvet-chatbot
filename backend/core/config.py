from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

ENV_PATH = Path(__file__).parent.parent.parent / ".env"
ROOT_DIR = Path(__file__).parent.parent.parent


class Settings(BaseSettings):
    openrouter_api_key: str
    database_url: str
    pinecone_api_key: str
    pinecone_index: str
    chroma_dir: str = str(ROOT_DIR / "chroma_db")

    model_config = SettingsConfigDict(env_file=ENV_PATH)


settings = Settings()

# if __name__ == "__main__":
#     print(settings.openrouter_api_key)
#     print(settings.database_url)

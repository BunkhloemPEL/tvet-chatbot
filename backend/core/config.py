from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

ENV_PATH = Path(__file__).parent.parent.parent / ".env"
ROOT_DIR = Path(__file__).parent.parent.parent


class Settings(BaseSettings):
    openrouter_api_key: str
    database_url: str
    pinecone_api_key: str | None = None
    pinecone_index: str | None = None
    pinecone_namespace: str | None = None
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    chroma_dir: str = str(ROOT_DIR / "chroma_db")
    vector_store_provider: str = "pinecone"
    vector_collection_name: str = "tvet_programs"
    embedding_use_e5_prefixes: bool = True
    embedding_normalize: bool = True
    retriever_k: int = 5

    model_config = SettingsConfigDict(env_file=ENV_PATH)


settings = Settings()

# if __name__ == "__main__":
#     print(settings.openrouter_api_key)
#     print(settings.database_url)

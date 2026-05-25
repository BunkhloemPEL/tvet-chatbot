from langchain_core.embeddings import Embeddings
from langchain_huggingface import HuggingFaceEmbeddings

EMBEDDING_MODEL = "intfloat/multilingual-e5-large"


class E5PrefixEmbeddings(Embeddings):
    """Adds E5-recommended query/passage prefixes without storing them in chunks."""

    def __init__(self, base_embeddings: Embeddings):
        self.base_embeddings = base_embeddings

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.base_embeddings.embed_documents(
            [f"passage: {text}" for text in texts]
        )

    def embed_query(self, text: str) -> list[float]:
        return self.base_embeddings.embed_query(f"query: {text}")


def get_embeddings(
    *,
    show_progress: bool = False,
    normalize_embeddings: bool = True,
    use_e5_prefixes: bool = True,
) -> Embeddings:
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        show_progress=show_progress,
        encode_kwargs={"normalize_embeddings": normalize_embeddings},
    )

    if use_e5_prefixes:
        return E5PrefixEmbeddings(embeddings)

    return embeddings

"""
Run once to migrate ChromaDB embeddings to Pinecone.
python migrate_to_pinecone.py
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
from core.config import settings

CHROMA_DIR = settings.chroma_dir
COLLECTION_NAME = "tvet_programs"
EMBEDDING_MODEL = "intfloat/multilingual-e5-large"


def migrate():
    print("Loading embedding model...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    print("Reading from ChromaDB...")
    chroma = Chroma(
        persist_directory=CHROMA_DIR,
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
    )

    results = chroma.get(include=["documents", "metadatas"])
    documents = results["documents"]
    metadatas = results["metadatas"]

    print(f"   Found {len(documents)} chunks in ChromaDB")

    print("Connecting to Pinecone...")
    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index)
    print(f"   Connected to index: {settings.pinecone_index}")

    print("Uploading to Pinecone...")
    vectorstore = PineconeVectorStore(
        index=index,
        embedding=embeddings,
    )

    BATCH_SIZE = 100
    for start in range(0, len(documents), BATCH_SIZE):
        end = min(start + BATCH_SIZE, len(documents))
        vectorstore.add_texts(
            texts=documents[start:end],
            metadatas=metadatas[start:end],
        )
        print(f"   Uploaded {end}/{len(documents)} chunks...")

    print(f"\nMigration complete! {len(documents)} chunks now in Pinecone.")


if __name__ == "__main__":
    migrate()

from dataclasses import dataclass
from pathlib import Path
import hashlib
import re
import unicodedata

from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone

from core.config import settings
from services.embedding_service import get_embeddings

KHMER_SEPARATORS = [
    "\n\n",
    "\n",
    "។",
    "៕",
    "៖",
    ".",
    "?",
    "!",
    " ",
    "",
]


@dataclass(frozen=True)
class IngestionConfig:
    pdf_path: Path
    vector_store: str = "chroma"
    collection_name: str = "tvet_programs_v2"
    document_version: str = "v2"
    source_name: str | None = None
    chunk_size: int = 1000
    chunk_overlap: int = 150
    min_page_chars: int = 20
    reset_collection: bool = False
    pinecone_namespace: str | None = None
    show_progress: bool = False
    use_e5_prefixes: bool = True
    normalize_embeddings: bool = True


@dataclass(frozen=True)
class IngestionResult:
    source: str
    vector_store: str
    collection_name: str
    document_version: str
    pages_read: int
    pages_with_text: int
    chunks_created: int
    chunk_size: int
    chunk_overlap: int


def extract_pdf_pages(pdf_path: Path, min_page_chars: int = 20) -> list[Document]:
    fitz = import_pymupdf()
    pages = []

    with fitz.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf, start=1):
            raw_text = page.get_text("text", sort=True) or ""
            clean_text = clean_text_for_rag(raw_text)

            if len(clean_text) < min_page_chars:
                continue

            pages.append(
                Document(
                    page_content=clean_text,
                    metadata={
                        "page": page_number,
                    },
                )
            )

    return pages


def clean_text_for_rag(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00a0", " ")
    text = text.replace("\u200b", " ")

    cleaned_lines = []
    for line in text.splitlines():
        line = re.sub(r"[ \t]+", " ", line).strip()

        if not line:
            if cleaned_lines and cleaned_lines[-1] != "":
                cleaned_lines.append("")
            continue

        if is_probable_page_number(line):
            continue

        cleaned_lines.append(line)

    cleaned = "\n".join(cleaned_lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def is_probable_page_number(line: str) -> bool:
    return bool(re.fullmatch(r"[-–—]?\s*\d{1,3}\s*[-–—]?", line))


def prepare_documents(config: IngestionConfig) -> list[Document]:
    source = config.source_name or config.pdf_path.name
    page_documents = extract_pdf_pages(config.pdf_path, config.min_page_chars)

    for doc in page_documents:
        doc.metadata.update(
            {
                "source": source,
                "source_path": str(config.pdf_path),
                "document_version": config.document_version,
            }
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
        separators=KHMER_SEPARATORS,
        add_start_index=True,
    )
    chunks = splitter.split_documents(page_documents)

    for index, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = index
        chunk.metadata["chunk_id"] = build_chunk_id(chunk)

    return chunks


def ingest_pdf(config: IngestionConfig) -> IngestionResult:
    pdf_path = config.pdf_path.resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    normalized_config = IngestionConfig(
        pdf_path=pdf_path,
        vector_store=config.vector_store,
        collection_name=config.collection_name,
        document_version=config.document_version,
        source_name=config.source_name,
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
        min_page_chars=config.min_page_chars,
        reset_collection=config.reset_collection,
        pinecone_namespace=config.pinecone_namespace,
        show_progress=config.show_progress,
        use_e5_prefixes=config.use_e5_prefixes,
        normalize_embeddings=config.normalize_embeddings,
    )

    chunks = prepare_documents(normalized_config)
    page_count = count_pdf_pages(pdf_path)
    pages_with_text = len({chunk.metadata["page"] for chunk in chunks})

    if not chunks:
        raise ValueError("No text chunks were created from this PDF.")

    if normalized_config.vector_store == "chroma":
        write_to_chroma(chunks, normalized_config)
    elif normalized_config.vector_store == "pinecone":
        write_to_pinecone(chunks, normalized_config)
    else:
        raise ValueError(
            "vector_store must be either 'chroma' or 'pinecone', "
            f"got: {normalized_config.vector_store}"
        )

    return IngestionResult(
        source=normalized_config.source_name or pdf_path.name,
        vector_store=normalized_config.vector_store,
        collection_name=normalized_config.collection_name,
        document_version=normalized_config.document_version,
        pages_read=page_count,
        pages_with_text=pages_with_text,
        chunks_created=len(chunks),
        chunk_size=normalized_config.chunk_size,
        chunk_overlap=normalized_config.chunk_overlap,
    )


def count_pdf_pages(pdf_path: Path) -> int:
    fitz = import_pymupdf()
    with fitz.open(pdf_path) as pdf:
        return pdf.page_count


def import_pymupdf():
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError(
            "PyMuPDF is required for PDF ingestion. Install it with "
            "`pip install PyMuPDF` or `pip install -r requirements.txt`."
        ) from exc

    return fitz


def write_to_chroma(chunks: list[Document], config: IngestionConfig) -> None:
    embeddings = get_embeddings(
        show_progress=config.show_progress,
        normalize_embeddings=config.normalize_embeddings,
        use_e5_prefixes=config.use_e5_prefixes,
    )

    vectorstore = Chroma(
        persist_directory=settings.chroma_dir,
        collection_name=config.collection_name,
        embedding_function=embeddings,
    )

    if config.reset_collection:
        vectorstore.delete_collection()
        vectorstore = Chroma(
            persist_directory=settings.chroma_dir,
            collection_name=config.collection_name,
            embedding_function=embeddings,
        )

    vectorstore.add_documents(
        chunks,
        ids=[chunk.metadata["chunk_id"] for chunk in chunks],
    )


def write_to_pinecone(chunks: list[Document], config: IngestionConfig) -> None:
    if not settings.pinecone_api_key or not settings.pinecone_index:
        raise ValueError(
            "PINECONE_API_KEY and PINECONE_INDEX are required for Pinecone ingestion."
        )

    embeddings = get_embeddings(
        show_progress=config.show_progress,
        normalize_embeddings=config.normalize_embeddings,
        use_e5_prefixes=config.use_e5_prefixes,
    )
    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index)

    namespace = config.pinecone_namespace or config.collection_name

    if config.reset_collection:
        index.delete(delete_all=True, namespace=namespace)

    vectorstore = PineconeVectorStore(
        index=index,
        embedding=embeddings,
        namespace=namespace,
    )
    vectorstore.add_documents(
        chunks,
        ids=[chunk.metadata["chunk_id"] for chunk in chunks],
    )


def build_chunk_id(chunk: Document) -> str:
    source = chunk.metadata.get("source", "unknown-source")
    version = chunk.metadata.get("document_version", "unknown-version")
    page = chunk.metadata.get("page", "unknown-page")
    chunk_index = chunk.metadata.get("chunk_index", "unknown-index")
    start_index = chunk.metadata.get("start_index", "unknown-start")
    content_hash = hashlib.sha1(chunk.page_content.encode("utf-8")).hexdigest()[:12]
    raw_id = f"{source}:{version}:p{page}:c{chunk_index}:s{start_index}:{content_hash}"
    return re.sub(r"[^a-zA-Z0-9_.:-]", "_", raw_id)

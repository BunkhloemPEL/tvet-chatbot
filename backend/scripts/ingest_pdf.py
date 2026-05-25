"""
Admin-only PDF ingestion command.

Example:
python scripts/ingest_pdf.py --pdf "..\\data\\official_tvet.pdf" --store chroma --collection tvet_programs_v2 --version 2026 --reset
"""

import argparse
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from services.ingest_service import IngestionConfig, ingest_pdf, prepare_documents
from core.config import settings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract, chunk, embed, and store an official TVET PDF."
    )
    parser.add_argument("--pdf", required=True, help="Path to the PDF file.")
    parser.add_argument(
        "--store",
        choices=["chroma", "pinecone"],
        default=settings.vector_store_provider,
        help="Vector store target. Default comes from VECTOR_STORE_PROVIDER.",
    )
    parser.add_argument(
        "--collection",
        default=settings.vector_collection_name,
        help="Chroma collection name, or Pinecone namespace fallback.",
    )
    parser.add_argument(
        "--namespace",
        default=settings.pinecone_namespace,
        help="Pinecone namespace. Defaults to collection name when omitted.",
    )
    parser.add_argument(
        "--version",
        default="v2",
        help="Document version metadata, for example 2026 or v2.",
    )
    parser.add_argument(
        "--source-name",
        default=None,
        help="Human-readable source name. Defaults to the PDF filename.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Maximum chunk size in characters.",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=150,
        help="Chunk overlap in characters.",
    )
    parser.add_argument(
        "--min-page-chars",
        type=int,
        default=20,
        help="Skip pages with less extracted text than this value.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete the target collection/namespace before inserting chunks.",
    )
    parser.add_argument(
        "--no-e5-prefixes",
        action="store_true",
        help="Disable E5 query/passage prefixes. Only use for old unprefixed collections.",
    )
    parser.add_argument(
        "--no-normalize",
        action="store_true",
        help="Disable embedding vector normalization.",
    )
    parser.add_argument(
        "--show-progress",
        action="store_true",
        help="Show embedding model progress output.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Extract and chunk the PDF without writing vectors.",
    )
    parser.add_argument(
        "--sample-chunks",
        type=int,
        default=3,
        help="Number of sample chunks to print during dry run.",
    )
    return parser.parse_args()


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    args = parse_args()
    config = IngestionConfig(
        pdf_path=Path(args.pdf),
        vector_store=args.store,
        collection_name=args.collection,
        document_version=args.version,
        source_name=args.source_name,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
        min_page_chars=args.min_page_chars,
        reset_collection=args.reset,
        pinecone_namespace=args.namespace,
        show_progress=args.show_progress,
        use_e5_prefixes=not args.no_e5_prefixes,
        normalize_embeddings=not args.no_normalize,
    )

    if args.dry_run:
        chunks = prepare_documents(config)
        print(f"Dry run complete. Created {len(chunks)} chunks.")
        print(f"PDF: {Path(args.pdf).resolve()}")
        print(f"Chunk size: {args.chunk_size}")
        print(f"Chunk overlap: {args.chunk_overlap}")
        print()

        for chunk in chunks[: args.sample_chunks]:
            print("-" * 80)
            print(
                "page={page} chunk_index={chunk_index} start_index={start_index}".format(
                    **chunk.metadata
                )
            )
            print(chunk.page_content[:1000])
            print()
        return

    result = ingest_pdf(config)
    print("Ingestion complete.")
    print(f"Source: {result.source}")
    print(f"Vector store: {result.vector_store}")
    print(f"Collection/namespace: {result.collection_name}")
    print(f"Document version: {result.document_version}")
    print(f"Pages read: {result.pages_read}")
    print(f"Pages with text: {result.pages_with_text}")
    print(f"Chunks created: {result.chunks_created}")
    print(f"Chunk size: {result.chunk_size}")
    print(f"Chunk overlap: {result.chunk_overlap}")


if __name__ == "__main__":
    main()

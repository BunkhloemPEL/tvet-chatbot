from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.runnables import RunnableLambda
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

from langchain_core.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from core.config import settings

CHROMA_DIR = settings.chroma_dir
COLLECTION_NAME = "tvet_programs"
EMBEDDING_MODEL = "intfloat/multilingual-e5-large"

SYSTEM_PROMPT = """អ្នកគឺជាជំនួយការ TVET របស់កម្ពុជា — មិត្តរួមការងារដ៏ស្និទ្ធស្នាល ដែលជួយនិស្សិតស្វែងរកកម្មវិធីបណ្តុះបណ្តាល។

You are a friendly TVET advisor for Cambodia. You help students find the right vocational training programs.

Personality & tone:
- Warm and conversational, like a knowledgeable friend — not a formal FAQ bot
- Never greet the user more than once per conversation
- Never repeat phrases like "តើអ្នកមានសំណួរទៀតទេ?" at the end of every reply — it feels robotic
- Keep responses concise unless the user asks for detail
- Remember what was discussed earlier and refer back naturally

Language:
- Respond in Khmer if the user writes in Khmer
- Respond in English if the user writes in English
- If mixed, follow the dominant language

Answering rules:
- Base answers ONLY on the retrieved context provided. Never invent programs or details.
- If the context lacks the answer, say naturally: "ខ្ញុំមិនឃើញព័ត៌មាននោះក្នុងទិន្នន័យរបស់ខ្ញុំទេ"
- Include contact details when available and relevant
- For lists of programs, use clean numbered or bullet format with bold institute headers
- For single-program follow-ups, answer conversationally in prose"""


def load_vectorstore():
    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index)
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    return PineconeVectorStore(index=index, embedding=embeddings)


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


def format_history(history: list[dict]) -> str:
    if not history:
        return "គ្មានប្រវត្តិសន្ទនា / No conversation history yet."
    lines = []
    for msg in history:
        role = "និស្សិត" if msg["role"] == "user" else "ជំនួយការ"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


def build_chain():
    vectorstore = load_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    llm = ChatOpenAI(
        model="google/gemini-2.0-flash-lite-001",
        openai_api_key=settings.openrouter_api_key,
        openai_api_base="https://openrouter.ai/api/v1",
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
            HumanMessagePromptTemplate.from_template(
                """[ប្រវត្តិសន្ទនា / Conversation history:]
{history}

[ព័ត៌មានដែលបានស្រង់ / Retrieved context:]
{context}

[សំណួររបស់និស្សិត / Student question:]
{question}"""
            ),
        ]
    )

    chain = (
        {
            "context": RunnableLambda(lambda x: x["question"])
            | retriever
            | format_docs,
            "question": RunnableLambda(lambda x: x["question"]),
            "history": RunnableLambda(lambda x: format_history(x.get("history", []))),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda
from langchain_chroma import Chroma
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

from langchain_core.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from core.config import settings
from services.embedding_service import get_embeddings
from services.state_service import format_state_for_prompt

CHROMA_DIR = settings.chroma_dir
COLLECTION_NAME = settings.vector_collection_name

QUERY_REWRITE_PROMPT = """
Rewrite the user's latest message into one standalone semantic search query for a
Cambodia TVET vector database.

Use the conversation history and structured state only to resolve references,
follow-ups, and missing context. Do not answer the user. Do not add facts that are
not supported by the history or state.

Return only the rewritten search query. Keep it concise.
"""

# SYSTEM_PROMPT = """អ្នកគឺជាជំនួយការ TVET របស់កម្ពុជា — មិត្តរួមការងារដ៏ស្និទ្ធស្នាល ដែលជួយនិស្សិតស្វែងរកកម្មវិធីបណ្តុះបណ្តាល។

# You are a friendly TVET advisor for Cambodia. You help students find the right vocational training programs.

# Personality & tone:
# - Warm and conversational, like a knowledgeable friend — not a formal FAQ bot
# - Never greet the user more than once per conversation
# - Never repeat phrases like "តើអ្នកមានសំណួរទៀតទេ?" at the end of every reply — it feels robotic
# - Keep responses concise unless the user asks for detail
# - Remember what was discussed earlier and refer back naturally

# Language:
# - Respond in Khmer if the user writes in Khmer
# - Respond in English if the user writes in English
# - If mixed, follow the dominant language

# Answering rules:
# - Base answers ONLY on the retrieved context provided. Never invent programs or details.
# - If the context lacks the answer, say naturally: "ខ្ញុំមិនឃើញព័ត៌មាននោះក្នុងទិន្នន័យរបស់ខ្ញុំទេ"
# - Include contact details when available and relevant
# - For lists of programs, use clean numbered or bullet format with bold institute headers
# - For single-program follow-ups, answer conversationally in prose"""

SYSTEM_PROMPT = """ 

You are a TVET advisor for Cambodia. Your primary users are school counselors helping Grade 9 students at risk of dropping out. You may also speak with parents and students.

## Tone
You are a helpful and cheerful human consultant but still remain professional with the information you provide
- Counselor: professional, efficient, collaborative. Use bullet points for lists.
- Parent: respectful, simple, evidence-focused. Explain jargon.
- Student: warm, hopeful, strength-focused. Never condescending.
- Never greet more than once. Never end with repetitive prompts. Keep responses concise.
- If conversation history is not empty, do not greet again, reintroduce yourself, or apologize unless there was a clear mistake.

## Language
- Match the user's language (Khmer or English). Use natural, conversational Khmer.
- Simplify vocabulary for parents and students.

## Answer First
- Always answer the user's direct question first using the retrieved context.
- Ask clarifying questions only after giving a useful initial answer.
- Ask at most one follow-up question at the end, and only when it clearly improves the next answer.
- Do not ask for location, interests, strengths, finances, or logistics unless the user asks for program recommendations, matching, or comparison.
- If the user refuses to share profile information, respect that choice and continue with general guidance. Do not ask for the same profile details again.
- If the user asks about applying, admission, enrollment, requirements, documents, or "what do I need", first give a general checklist or steps, then mention that exact requirements may vary by institute or program.

## Mode Detection
Before responding, detect the user's mode:
- Exploration: list programs, offer to filter further.
- Diagnosis: answer the immediate concern first, then ask one targeted question only if needed.
- Matching: present ranked options with reasoning and match quality.
- Comparison: side-by-side. Highlight trade-offs.
- Persuasion: provide evidence, outcomes, stories. Be honest about uncertainty.
- Action: step-by-step guidance with contacts and deadlines.
- Crisis: acknowledge difficulty, offer alternatives, prioritize human contacts.

## Student Profile (for matching)
Gather profile details only when they are needed for matching or recommendations. Gather conversationally and gradually: location, academic level, interests/strengths, financial constraints, time horizon, logistical constraints, gender/cultural considerations.

## Data Honesty
- NEVER invent program details, costs, or outcomes.
- Always distinguish database facts from estimates from web search.
- When cost is missing, provide benchmarks if available, then give institute contact.
- When nothing is found, say so and suggest direct contact.
- Never guarantee job outcomes. Use cautious, evidence-based language.
- Include institute contact details with every recommendation.

## Cultural Awareness
- Families make decisions collectively. Respect their concerns.
- TVET carries stigma in Cambodia. Actively counter it with success narratives.
- Acknowledge that immediate income needs are real, not short-sighted.
- Some students lack formal ID. Suggest flexible entry paths.

## Boundaries
- Not a therapist, financial advisor, or guarantor.
- Protect student privacy. Don't ask for or store full names or ID numbers.

## Final Instruction
Be helpful, honest, human. Behind every query is a real student, teacher, and parent. Point the way when you don't know. Move every conversation toward actionable help.

"""


def load_vectorstore():
    embeddings = get_embeddings(
        use_e5_prefixes=settings.embedding_use_e5_prefixes,
        normalize_embeddings=settings.embedding_normalize,
    )

    if settings.vector_store_provider.lower() == "chroma":
        return Chroma(
            persist_directory=CHROMA_DIR,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
        )

    if settings.vector_store_provider.lower() == "pinecone":
        if not settings.pinecone_api_key or not settings.pinecone_index:
            raise ValueError(
                "PINECONE_API_KEY and PINECONE_INDEX are required when "
                "VECTOR_STORE_PROVIDER=pinecone"
            )

        pc = Pinecone(api_key=settings.pinecone_api_key)
        index = pc.Index(settings.pinecone_index)
        return PineconeVectorStore(
            index=index,
            embedding=embeddings,
            namespace=settings.pinecone_namespace,
        )

    raise ValueError(
        "vector_store_provider must be either 'chroma' or 'pinecone', "
        f"got: {settings.vector_store_provider}"
    )


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


def rewrite_retrieval_query(inputs: dict, query_rewriter: ChatOpenAI) -> str:
    question = inputs["question"]
    history = format_history(inputs.get("history", []))
    state = format_state_for_prompt(inputs.get("state", {}))

    user_prompt = f"""Conversation history:
{history}

Structured conversation state:
{state}

Latest user message:
{question}"""

    try:
        response = query_rewriter.invoke(
            [
                ("system", QUERY_REWRITE_PROMPT),
                ("human", user_prompt),
            ]
        )
        rewritten = response.content.strip().strip('"')
        return rewritten[:500] or question
    except Exception:
        return question


def build_chain():
    vectorstore = load_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": settings.retriever_k})

    llm = ChatOpenAI(
        model="google/gemini-2.0-flash-lite-001",
        openai_api_key=settings.openrouter_api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0.7,
    )
    query_rewriter = ChatOpenAI(
        model="google/gemini-2.0-flash-lite-001",
        openai_api_key=settings.openrouter_api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0,
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
            HumanMessagePromptTemplate.from_template(
                """[ប្រវត្តិសន្ទនា / Conversation history:]
{history}

[ស្ថានភាពសន្ទនា / Conversation state:]
{state}

[ព័ត៌មានដែលបានស្រង់ / Retrieved context:]
{context}

[សំណួររបស់និស្សិត / Student question:]
{question}"""
            ),
        ]
    )

    chain = (
        {
            "context": RunnableLambda(
                lambda x: rewrite_retrieval_query(x, query_rewriter)
            )
            | retriever
            | format_docs,
            "question": RunnableLambda(lambda x: x["question"]),
            "history": RunnableLambda(lambda x: format_history(x.get("history", []))),
            "state": RunnableLambda(
                lambda x: format_state_for_prompt(x.get("state", {}))
            ),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain

# TVET Chatbot Project Handoff

Last updated: 2026-05-29

## Project Purpose

This project is a RAG-based TVET chatbot for Cambodia. The core user is a school counselor helping Grade 9 students who may be at risk of dropping out. It can also support students and parents.

The chatbot should help users understand:

- TVET schools and programs from the ingested official document
- admission/application requirements
- scholarships or fee support when verifiable
- contact details for institutes
- basic program matching using the user's background, location, interests, financial constraints, and logistics

The chatbot should not pretend to be a full career advisor, therapist, financial advisor, or job-outcome guarantor.

## Current Architecture

Backend:

- FastAPI app entry: `backend/main.py`
- Chat routes: `backend/routers/chat.py`
- Auth routes: `backend/routers/auth.py`
- Database models: `backend/database.py`
- DB helper functions: `backend/crud.py`
- RAG runtime: `backend/services/rag_service.py`
- PDF ingestion: `backend/services/ingest_service.py`
- Embeddings: `backend/services/embedding_service.py`
- Conversation state extraction: `backend/services/state_service.py`
- Tavily web evidence layer: `backend/services/web_search_service.py`

Frontend:

- React/Vite app under `frontend/`
- Chat state hook: `frontend/src/hooks/useChat.js`
- Auth hook: `frontend/src/hooks/useAuth.js`

Vector storage:

- Runtime supports Chroma or Pinecone.
- Current `.env` should decide provider through `VECTOR_STORE_PROVIDER`.
- Chroma persistence defaults to `chroma_db/`.

## Runtime Chat Flow

The current chat flow is:

```text
user message
-> save user message
-> load chat history
-> load stored conversation state
-> maybe update state with LLM extractor
-> call RAG pipeline
   -> rewrite retrieval query using history + state
   -> retrieve official context from vector store
   -> decide whether Tavily web search is needed
   -> if needed, build English + Khmer queries
   -> run Tavily search
   -> dedupe/filter/evaluate web evidence
   -> answer from official context + web evidence
-> save assistant message
-> save updated state when changed
```

The router still calls:

```python
chain.invoke({
    "question": request.message,
    "history": history,
    "state": updated_state,
})
```

Internally, `chain` is now a custom `RagPipeline` object in `rag_service.py`, not a pure LCEL mapping.

## Conversation State

Conversation state is stored per chat session in the `conversation_states` table.

The state shape is centered on TVET advising:

```json
{
  "user_profile": {
    "user_type": null,
    "student_grade": null,
    "student_age": null,
    "province": null,
    "district": null,
    "interests": [],
    "student_uncertain": null,
    "financial_constraint": null,
    "can_relocate": null,
    "preferred_work_style": null,
    "urgency_to_earn_income": null,
    "desired_career": null
  },
  "conversation": {
    "language": null,
    "intent": null,
    "needs_recommendation": false,
    "needs_application_info": false,
    "needs_scholarship_info": false,
    "user_refused_profile": false
  }
}
```

State extraction is gated. It does not run on every message. A cheap keyword-based check in `state_service.py` decides whether the latest message is likely to update profile/state. Obvious follow-ups such as "more" or "why" skip extraction.

## Prompt Behavior Rules Added

The system prompt in `rag_service.py` now includes:

- answer first, then ask at most one useful follow-up
- no repeated greeting when history exists
- do not profile users unless matching/recommendation needs it
- respect refusal to share profile details
- be honest when data is missing
- distinguish official TVET database facts from web evidence
- never guarantee job outcomes
- do not act as a career advisor or predict labor-market outcomes

Important boundary:

If the user asks about career opportunity, job market, or guaranteed employment, the bot should not expand into career prediction. It should redirect to TVET program selection support using verified program info, scholarships, requirements, location, interests, financial constraints, and logistics.

## Tavily Web Evidence Layer

Tavily is optional and controlled by `.env`.

Expected config:

```env
ENABLE_WEB_SEARCH=true
TAVILY_API_KEY=your_tavily_key
TAVILY_MAX_RESULTS=5
TAVILY_SEARCH_DEPTH=basic
TAVILY_TIMEOUT_SECONDS=15
```

Do not commit or paste real keys.

Tavily is used only for missing/current/school-specific info such as:

- duration
- schedule
- enrollment/intake/deadline
- scholarship
- tuition/fees
- recent announcements/events

It is not currently used for job-market/career prediction.

The web layer is evidence-based:

```text
should_search_web()
-> build_bilingual_queries()
-> run_tavily_searches()
-> dedupe_and_rank_results()
-> evaluate_web_evidence()
-> format_web_context_for_prompt()
```

Evidence modes:

- `verified_answer`
- `partial_answer`
- `weak_signal_answer`
- `not_found_contact_school`

For partial or weak evidence with missing fields, the pipeline may return a deterministic guarded answer instead of letting the LLM fill gaps.

Example final behavior from testing:

```text
I could not fully verify these details from the official TVET database or the web evidence.

Not verified: duration, schedule.

I found related evidence that this institute has had scholarship/support information before, but I cannot confirm that it is currently open.

Source: https://scholarship.tvet.gov.kh/home/search-school/info/64f00cba4545c5fbd891b2eb

For the safest answer, contact the institute directly to confirm.
```

This conservative behavior is intentional.

## Known Issues And Cautions

- The official vector data may not contain detailed duration, schedule, enrollment, or scholarship information.
- Tavily can return irrelevant or generic scholarship pages. The service now filters for target-school relevance, but this will need ongoing tuning.
- Facebook results are classified as social evidence. Treat them as weak unless they clearly come from an official institute page and directly answer the question.
- The LLM can still overstate weak evidence if not guarded. Keep evidence assessment and guarded answer logic.
- The current RAG retrieval sometimes returns thin chunks, such as table-of-contents-like text. Improving ingestion/chunking may be necessary.
- The model and embeddings can be slow locally because Hugging Face embeddings load during backend startup/runtime.
- Do not add career-path prediction without reliable labor-market data.

## How To Run

Backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Frontend:

```powershell
cd frontend
npm run dev
```

If `.env` changes, restart the backend. The RAG pipeline is built when the chat router imports `build_chain()`.

## Useful Test Scenarios

Normal RAG, no Tavily:

```text
What TVET programs are available in Phnom Penh?
```

Application requirements:

```text
What do I need to apply for TVET?
```

Scholarship/current info, should trigger Tavily:

```text
I live in Battambang and my family cannot afford tuition. Are there TVET scholarships in my province?
```

Weak/missing school details:

```text
What about program duration, schedule and available scholarship?
```

Career/job guarantee boundary:

```text
Which program guarantees that I will get a job?
```

Expected behavior:

- no job guarantee
- no career prediction
- redirect to TVET selection criteria
- ask at most one preference question if useful

## Suggested Next Steps

1. Evaluate prompt behavior with 15-30 realistic Khmer and English user conversations.
2. Improve PDF ingestion/chunking if retrieval returns mostly headings or page-number-like chunks.
3. Add debug logging for:
   - rewritten retrieval query
   - whether web search was triggered
   - Tavily queries
   - evidence assessment mode
4. Add tests for `web_search_service.py`, especially relevance filtering and weak evidence handling.
5. Consider a small admin/debug endpoint to inspect session state and evidence decisions during development.
6. Only consider LangGraph after there are several stable branching workflows, such as normal RAG, web evidence fallback, and a separate guided recommendation workflow.

## Things Not To Do Yet

- Do not migrate to LangGraph just for the current flow.
- Do not add job-market/career prediction without trusted data.
- Do not make Tavily the primary truth source.
- Do not let the final answer model present weak web evidence as confirmed current information.
- Do not store sensitive student identity data such as full names or ID numbers.

## Current Implementation Status

Implemented:

- RAG over Chroma/Pinecone
- E5 multilingual embeddings
- PDF ingestion pipeline
- auth and chat sessions
- persistent conversation state
- gated state extraction
- history-aware retrieval query rewriting
- optional Tavily web evidence layer
- evidence assessment and guarded weak-evidence answers
- prompt boundaries for answer-first behavior, no repeated greetings, data honesty, and career/job guarantees

Still needs:

- more evaluation conversations
- better retrieval/chunk quality checks
- unit tests for state and web evidence services
- frontend/backend error handling polish
- production deployment hardening

1. Start with project folder scuffolding.

```
tvet-chatbot/
│
├── backend/
│   ├── main.py                  ← FastAPI app entry point
│   ├── database.py              ← SQLAlchemy setup
│   ├── crud.py                  ← DB operations
│   │
│   ├── routers/                 ← one file per feature
│   │   ├── chat.py              ← /chat endpoints
│   │   ├── documents.py         ← /documents upload endpoints
│   │   └── auth.py              ← /auth login/register endpoints
│   │
│   ├── services/                ← business logic lives here
│   │   ├── rag_service.py       ← LangChain RAG chain
│   │   ├── ingest_service.py    ← document parsing + embedding
│   │   └── auth_service.py      ← JWT logic
│   │
│   ├── models/                  ← Pydantic request/response models
│   │   ├── chat.py
│   │   ├── document.py
│   │   └── user.py
│   │
│   ├── core/                    ← app config + settings
│   │   └── config.py            ← all env vars loaded here
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   └── DocumentUpload.jsx
│   │   └── services/
│   │       └── api.js           ← all fetch calls to backend
│   └── package.json
│
├── docker-compose.yml           ← runs everything together
├── .env
└── README.md
```

I have to manually create the back end of my folder and file.
But the frontend we can just use vite npm scaffolding.

2. Then I create the virtual env for the project. (We will wrap this in docker when dockerize)

```
cd backend
python -m venv venv
source venv/Scripts/activate
pip install fastapi uvicorn langchain langchain-community langchain-chroma langchain-huggingface langchain-openai sqlalchemy psycopg2-binary python-dotenv pdfplumber chromadb sentence-transformers
pip freeze > requirements.txt
```

"Install `pip install pydantic-settings` also for `config.py`"

3. After venv is ready, we will setup `core/config.py`
   This will read the key in `env` using pydantic_setting
   Every other file will import from config.py. It needs to exist before anything else.

4. Next is create database structure and migrate. We are coding the datamodel

5. Next part is debateable because :
   It's about building CRUD to retrieve data in DB for API (Bottom up). Somtime DEV would build skeleton first (Required API and logic.etc.) then build CRUD for it.

- Bottom up is safer — everything you call already exists and works
- Top down is faster — but you need experience to know what placeholders to write

6. This step should be about the vectorized db setup and `ingest.py` file. Which has 2 main key (ChromaDB)

- Persistant directory
- Embedding model

But since I already have an exisiting vector DB, I will skip this and work on RAG chain instead.

7. RAG Chain. `backend/services/rag_service.py`

- Connect and Load the vectorize DB
- build chain (include system prompt, model api, format outcome message)

8. Write endpoint

in `main.py` we create the fast api class to expose the endpoint
ine the `/router/` we write all the endpoint logic there e.g `/chat`, `/auth/login` . . . .

8.1 We can do RAG evaluation here with our endpoint up running but the testing phase will be an ongoing phase until the end anyway.

9. Frontend Folder Structure.

```
src/
├── components/
│   ├── Message.jsx          # Single chat bubble
│   ├── TypingDots.jsx       # The animated dots
│   ├── SuggestedQuestions.jsx  # The clickable suggestion chips
│   └── ChatInput.jsx        # The textarea + send button
│
├── hooks/
│   └── useChat.js           # All the state logic (messages, loading, sendMessage)
│
├── constants/
│   └── index.js             # API_URL, SESSION_ID, SUGGESTED_QUESTIONS
│
├── styles/
│   └── global.css           # The big <style> block (animations, scrollbar, etc.)
│
└── App.jsx                  # Just the layout shell — thin and clean
```

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import router as auth_router


from core.config import settings
from database import init_db


from routers.chat import router as chat_router

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)

init_db()


@app.get("/")
async def root():
    return {"message": "TVET Chatbot API is running"}

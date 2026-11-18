from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.db.models import *
from app.db.session import Base, engine

app = FastAPI(title="Devs Soluntions API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.on_event("startup")
def create_database_schema() -> None:
    Base.metadata.create_all(bind=engine)

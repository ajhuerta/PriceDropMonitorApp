from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import create_tables
from scheduler import start_scheduler, stop_scheduler
from routers import items, prices


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Price Drop Monitor API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router)
app.include_router(prices.router)

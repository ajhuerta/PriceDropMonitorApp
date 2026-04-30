from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

SQLITE_URL = "sqlite:///./price_monitor.db"

engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def set_wal_mode(dbapi_connection, _):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    import models  # noqa: F401 — ensures models are registered before create_all
    Base.metadata.create_all(bind=engine)

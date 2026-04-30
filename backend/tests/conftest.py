import sys
import os

# Add backend/ to sys.path so all backend modules are importable from tests/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models  # registers ORM models with Base.metadata
from database import Base

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture
def db():
    """Isolated in-memory SQLite session for each test."""
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ItemCreate(BaseModel):
    url: str
    name: str
    target_price: float
    check_interval_minutes: int = 60


class ItemUpdate(BaseModel):
    url: Optional[str] = None
    name: Optional[str] = None
    target_price: Optional[float] = None
    check_interval_minutes: Optional[int] = None
    active: Optional[bool] = None


class ItemResponse(BaseModel):
    id: int
    url: str
    name: str
    target_price: float
    check_interval_minutes: int
    active: bool
    created_at: datetime
    last_alerted_at: Optional[datetime] = None
    current_price: Optional[float] = None
    last_scraped_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PriceHistoryResponse(BaseModel):
    id: int
    item_id: int
    price: float
    scraped_at: datetime

    model_config = {"from_attributes": True}


class ScrapeResult(BaseModel):
    success: bool
    price: Optional[float] = None
    message: str

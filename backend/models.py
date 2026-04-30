from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class MonitoredItem(Base):
    __tablename__ = "monitored_items"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    name = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    check_interval_minutes = Column(Integer, default=60)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_alerted_at = Column(DateTime, nullable=True)

    prices = relationship("PriceHistory", back_populates="item", cascade="all, delete-orphan")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("monitored_items.id"), nullable=False)
    price = Column(Float, nullable=False)
    scraped_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("MonitoredItem", back_populates="prices")

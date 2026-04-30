from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import MonitoredItem, PriceHistory
from schemas import PriceHistoryResponse

router = APIRouter(prefix="/prices", tags=["prices"])


@router.get("/{item_id}", response_model=list[PriceHistoryResponse])
def get_price_history(item_id: int, limit: int = 50, db: Session = Depends(get_db)):
    item = db.query(MonitoredItem).filter(MonitoredItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return (
        db.query(PriceHistory)
        .filter(PriceHistory.item_id == item_id)
        .order_by(PriceHistory.scraped_at.desc())
        .limit(limit)
        .all()
    )

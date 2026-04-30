from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import MonitoredItem, PriceHistory
from schemas import ItemCreate, ItemUpdate, ItemResponse, ScrapeResult
from scraper import scrape_amazon_price

router = APIRouter(prefix="/items", tags=["items"])


def _with_latest_price(item: MonitoredItem, db: Session) -> ItemResponse:
    latest = (
        db.query(PriceHistory)
        .filter(PriceHistory.item_id == item.id)
        .order_by(PriceHistory.scraped_at.desc())
        .first()
    )
    response = ItemResponse.model_validate(item)
    response.current_price = latest.price if latest else None
    response.last_scraped_at = latest.scraped_at if latest else None
    return response


@router.get("/", response_model=list[ItemResponse])
def get_items(db: Session = Depends(get_db)):
    items = db.query(MonitoredItem).order_by(MonitoredItem.created_at.desc()).all()
    return [_with_latest_price(item, db) for item in items]


@router.post("/", response_model=ItemResponse, status_code=201)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    db_item = MonitoredItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: ItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(MonitoredItem).filter(MonitoredItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in item.model_dump(exclude_unset=True).items():
        setattr(db_item, field, value)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(MonitoredItem).filter(MonitoredItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()


@router.post("/{item_id}/scrape-now", response_model=ScrapeResult)
async def scrape_now(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(MonitoredItem).filter(MonitoredItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    try:
        price = await scrape_amazon_price(db_item.url)
        if price is not None:
            history = PriceHistory(item_id=db_item.id, price=price)
            db.add(history)
            db.commit()
            return ScrapeResult(success=True, price=price, message=f"Scraped ${price:.2f}")
        return ScrapeResult(success=False, message="Could not extract price — Amazon may have changed selectors or served a CAPTCHA")
    except Exception as e:
        return ScrapeResult(success=False, message=str(e))

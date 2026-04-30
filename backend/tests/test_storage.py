"""
Tests for storage layer — ORM model creation, price history linking, cascade delete.
"""
from models import MonitoredItem, PriceHistory


def test_create_item_defaults(db):
    item = MonitoredItem(
        url="https://amazon.com/dp/B001",
        name="Widget",
        target_price=29.99,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    assert item.id is not None
    assert item.active is True
    assert item.check_interval_minutes == 60
    assert item.last_alerted_at is None


def test_price_history_linked_to_item(db):
    item = MonitoredItem(url="https://amazon.com/dp/B001", name="Widget", target_price=29.99)
    db.add(item)
    db.commit()
    db.refresh(item)

    history = PriceHistory(item_id=item.id, price=25.00)
    db.add(history)
    db.commit()

    result = db.query(PriceHistory).filter(PriceHistory.item_id == item.id).first()
    assert result is not None
    assert result.price == 25.00
    assert result.scraped_at is not None


def test_cascade_delete_removes_price_history(db):
    item = MonitoredItem(url="https://amazon.com/dp/B001", name="Widget", target_price=29.99)
    db.add(item)
    db.commit()
    db.refresh(item)
    item_id = item.id

    db.add(PriceHistory(item_id=item_id, price=25.00))
    db.add(PriceHistory(item_id=item_id, price=24.50))
    db.commit()

    db.delete(item)
    db.commit()

    orphans = db.query(PriceHistory).filter(PriceHistory.item_id == item_id).all()
    assert orphans == []

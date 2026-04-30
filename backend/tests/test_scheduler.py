"""
Tests for scheduler logic:
  - _is_due: determines whether enough time has elapsed to scrape again
  - _maybe_send_alert: fires email on price drop, respects 1-hour cooldown
"""
from datetime import datetime, timedelta
from unittest.mock import patch

from models import MonitoredItem, PriceHistory
from scheduler import _is_due, _maybe_send_alert


def _make_item(db, **kwargs) -> MonitoredItem:
    defaults = dict(
        url="https://amazon.com/dp/B001",
        name="Widget",
        target_price=29.99,
        check_interval_minutes=60,
    )
    item = MonitoredItem(**{**defaults, **kwargs})
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# --- _is_due ---

def test_is_due_with_no_history(db):
    item = _make_item(db)
    assert _is_due(db, item) is True


def test_is_due_false_when_scraped_recently(db):
    item = _make_item(db)
    db.add(PriceHistory(item_id=item.id, price=25.00, scraped_at=datetime.utcnow()))
    db.commit()
    assert _is_due(db, item) is False


def test_is_due_true_after_interval_elapsed(db):
    item = _make_item(db, check_interval_minutes=60)
    old_time = datetime.utcnow() - timedelta(minutes=61)
    db.add(PriceHistory(item_id=item.id, price=25.00, scraped_at=old_time))
    db.commit()
    assert _is_due(db, item) is True


# --- _maybe_send_alert ---

def test_maybe_send_alert_fires_when_no_prior_alert(db):
    item = _make_item(db, last_alerted_at=None)
    with patch("scheduler._send_email") as mock_send:
        _maybe_send_alert(db, item, 24.99)
        mock_send.assert_called_once_with(item, 24.99)


def test_maybe_send_alert_respects_one_hour_cooldown(db):
    recent = datetime.utcnow() - timedelta(minutes=30)
    item = _make_item(db, last_alerted_at=recent)
    with patch("scheduler._send_email") as mock_send:
        _maybe_send_alert(db, item, 24.99)
        mock_send.assert_not_called()


def test_maybe_send_alert_fires_after_cooldown_expires(db):
    old_alert = datetime.utcnow() - timedelta(hours=2)
    item = _make_item(db, last_alerted_at=old_alert)
    with patch("scheduler._send_email") as mock_send:
        _maybe_send_alert(db, item, 24.99)
        mock_send.assert_called_once()

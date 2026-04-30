import asyncio
import smtplib
import os
from email.mime.text import MIMEText
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from database import SessionLocal
from models import MonitoredItem, PriceHistory

scheduler = BackgroundScheduler()


def run_scrape_job():
    """
    Reads all active monitored items from DB at runtime (no restart needed to add/remove).
    Respects each item's check_interval_minutes by tracking last scrape via price history.
    """
    from scraper import scrape_amazon_price  # local import avoids circular at module load

    db = SessionLocal()
    try:
        items = db.query(MonitoredItem).filter(MonitoredItem.active == True).all()
        for item in items:
            if not _is_due(db, item):
                continue
            try:
                price = asyncio.run(scrape_amazon_price(item.url))
                if price is not None:
                    history = PriceHistory(item_id=item.id, price=price)
                    db.add(history)
                    db.commit()
                    print(f"[scheduler] {item.name}: ${price:.2f}")

                    if price <= item.target_price:
                        _maybe_send_alert(db, item, price)
                else:
                    print(f"[scheduler] {item.name}: could not parse price")
            except Exception as e:
                print(f"[scheduler] Error scraping {item.name}: {e}")
                db.rollback()
    finally:
        db.close()


def _is_due(db, item: MonitoredItem) -> bool:
    """Returns True if enough time has passed since the last scrape for this item."""
    last = (
        db.query(PriceHistory)
        .filter(PriceHistory.item_id == item.id)
        .order_by(PriceHistory.scraped_at.desc())
        .first()
    )
    if last is None:
        return True
    elapsed = datetime.utcnow() - last.scraped_at
    return elapsed >= timedelta(minutes=item.check_interval_minutes)


def _maybe_send_alert(db, item: MonitoredItem, price: float):
    now = datetime.utcnow()
    if item.last_alerted_at and (now - item.last_alerted_at) < timedelta(hours=1):
        return
    try:
        _send_email(item, price)
        item.last_alerted_at = now
        db.commit()
        print(f"[scheduler] Alert sent for {item.name}")
    except Exception as e:
        print(f"[scheduler] Email failed: {e}")


def _send_email(item: MonitoredItem, price: float):
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    alert_email = os.getenv("ALERT_EMAIL")

    if not all([smtp_user, smtp_password, alert_email]):
        print("[scheduler] Email not configured — set SMTP_USER, SMTP_PASSWORD, ALERT_EMAIL")
        return

    body = (
        f"Price Alert!\n\n"
        f"{item.name} dropped to ${price:.2f} (your target: ${item.target_price:.2f})\n\n"
        f"{item.url}"
    )
    msg = MIMEText(body)
    msg["Subject"] = f"Price Drop: {item.name} is now ${price:.2f}"
    msg["From"] = smtp_user
    msg["To"] = alert_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, alert_email, msg.as_string())


def start_scheduler():
    # Single job runs every minute; each item's interval is checked via _is_due()
    scheduler.add_job(run_scrape_job, "interval", minutes=1, id="price_check")
    scheduler.start()
    print("[scheduler] Started")


def stop_scheduler():
    scheduler.shutdown(wait=False)
    print("[scheduler] Stopped")

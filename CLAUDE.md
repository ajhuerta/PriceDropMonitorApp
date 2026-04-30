# PriceDropMonitorApp - Claude Reference

## Stack
- **Backend**: FastAPI + APScheduler (in-process) + SQLite via SQLAlchemy
- **Scraper**: Playwright (Python, async) + playwright-stealth for Amazon bot evasion
- **Frontend**: React + Vite (polling every 30s, no WebSockets)
- **Alerts**: Gmail SMTP via Python stdlib `smtplib`

## Project Structure
```
PriceDropMonitorApp/
├── CLAUDE.md
├── backend/
│   ├── main.py          # FastAPI app + lifespan (scheduler init/shutdown)
│   ├── database.py      # SQLAlchemy engine, SessionLocal, Base, WAL mode, get_db
│   ├── models.py        # MonitoredItem, PriceHistory ORM models
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── scheduler.py     # APScheduler setup + run_scrape_job (reads DB config)
│   ├── scraper.py       # scrape_amazon_price(url) → float | None
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── items.py     # CRUD + /scrape-now endpoint
│   │   └── prices.py    # GET /prices/{item_id}
│   ├── requirements.txt
│   └── .env             # SMTP_USER, SMTP_PASSWORD, ALERT_EMAIL (not committed)
└── frontend/            # Vite + React scaffold
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── AddItemForm.jsx
        │   ├── ItemTable.jsx
        │   └── PriceHistoryPanel.jsx
        └── api.js       # fetch wrappers for all endpoints
```

## Database Models
```
monitored_items:
  id, url, name, target_price, check_interval_minutes,
  active (bool), created_at, last_alerted_at

price_history:
  id, item_id (FK), price, scraped_at
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /items | List all monitored items |
| POST | /items | Add new item |
| PUT | /items/{id} | Update item (name, url, target_price, active, interval) |
| DELETE | /items/{id} | Remove item |
| POST | /items/{id}/scrape-now | Trigger immediate scrape |
| GET | /prices/{id} | Get price history for item |

## How to Run

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env  # fill in SMTP credentials
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # runs on http://localhost:5173
```

## Key Implementation Notes

### Amazon Scraper Selectors (try in order)
1. `#corePriceDisplay_desktop_feature_div .a-price .a-offscreen`
2. `.a-price[data-a-color='price'] .a-offscreen`
3. `#priceblock_ourprice`
4. `#priceblock_dealprice`
5. `.a-price .a-offscreen`

### Anti-bot Strategy
- `playwright-stealth` on every page context
- Random delay 2-5s after page load
- Realistic user-agent + 1280x720 viewport
- Don't scrape more frequently than check_interval_minutes

### Scheduler Design
- APScheduler `BackgroundScheduler` started in FastAPI `lifespan`
- Single job runs every 5 minutes, reads ALL active items from DB at runtime
- Each item has its own `check_interval_minutes` — job checks if it's time for each item
- `asyncio.run()` used to call async Playwright from sync scheduler thread

### Email Alert Logic
- Alert fires when `current_price <= target_price`
- Cooldown: skip if `last_alerted_at` within past 1 hour
- Config: `SMTP_USER`, `SMTP_PASSWORD`, `ALERT_EMAIL` env vars
- Gmail requires an App Password (not account password) with 2FA enabled

### SQLite / SQLAlchemy
- WAL mode enabled on connect via `event.listens_for(engine, "connect")`
- `check_same_thread=False` for multi-threaded access (FastAPI + APScheduler)
- Tables created on app startup via `Base.metadata.create_all()`

### CORS
- Allowed origin: `http://localhost:5173` (Vite dev server)

## Common Issues
- **Playwright can't find element**: Amazon changes selectors frequently — check DevTools and update `AMAZON_PRICE_SELECTORS` in scraper.py
- **asyncio nested loop error**: scrape-now endpoint is `async def`, scheduler uses `asyncio.run()` in background thread — don't mix these patterns
- **CAPTCHA**: If Amazon serves a CAPTCHA, the scraper returns `None`. Try reducing scrape frequency.
- **Gmail auth error**: Must use an App Password, not your Gmail password

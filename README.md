# PriceDropMonitorApp

Track Amazon product prices and get email alerts when they drop to your target.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                    │
│          (Vite · polls API every 30s)               │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP (localhost:8000)
┌───────────────────────▼─────────────────────────────┐
│                  FastAPI Backend                    │
│                                                     │
│  ┌─────────────┐   ┌──────────────────────────┐    │
│  │  REST API   │   │  APScheduler (background) │    │
│  │             │   │  Runs every minute.       │    │
│  │  /items     │   │  Reads active items from  │    │
│  │  /prices    │   │  DB, respects per-item    │    │
│  │  /scrape-now│   │  check_interval_minutes.  │    │
│  └──────┬──────┘   └────────────┬─────────────┘    │
│         │                       │                   │
│         └──────────┬────────────┘                   │
│                    │                                │
│          ┌─────────▼──────────┐                    │
│          │  Playwright Scraper │                    │
│          │  + playwright-stealth                    │
│          │  Amazon price fetch │                    │
│          └─────────┬──────────┘                    │
│                    │                                │
│          ┌─────────▼──────────┐                    │
│          │   SQLite (WAL mode) │                    │
│          │   monitored_items  │                    │
│          │   price_history    │                    │
│          └────────────────────┘                    │
└─────────────────────────────────────────────────────┘
                        │ Gmail SMTP (on price drop)
                   Email Alert
```

### Key Design Decisions

- **APScheduler reads DB config at runtime** — add/remove items or change intervals without restarting the server.
- **Playwright + stealth** — headless Chromium with anti-bot measures to avoid Amazon detection.
- **SQLite WAL mode** — allows concurrent reads from the API and writes from the scheduler without locking.
- **Frontend polling** — simple 30s interval fetch instead of WebSockets; sufficient for a price monitor.
- **Email cooldown** — alerts fire at most once per hour per item to avoid inbox spam.

---

## Project Structure

```
PriceDropMonitorApp/
├── backend/
│   ├── main.py          # FastAPI app + lifespan (scheduler start/stop)
│   ├── database.py      # SQLAlchemy engine, WAL mode, session factory
│   ├── models.py        # MonitoredItem, PriceHistory ORM models
│   ├── schemas.py       # Pydantic request/response types
│   ├── scraper.py       # scrape_amazon_price() via Playwright
│   ├── scheduler.py     # Background job + Gmail email alert
│   ├── routers/
│   │   ├── items.py     # CRUD endpoints + /scrape-now
│   │   └── prices.py    # Price history endpoint
│   ├── requirements.txt
│   └── .env.example     # Email config template
└── frontend/
    └── src/
        ├── App.jsx               # Root — polling, state
        ├── api.js                # fetch wrappers for all endpoints
        └── components/
            ├── AddItemForm.jsx       # Add new item form
            ├── ItemTable.jsx         # Items list with actions
            └── PriceHistoryPanel.jsx # Price history for selected item
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A Gmail account with [App Password](https://myaccount.google.com/apppasswords) enabled (requires 2FA)

---

## Setup & Start

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd PriceDropMonitorApp
```

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Install Playwright's Chromium browser
playwright install chromium

# Configure email alerts
cp .env.example .env
# Edit .env and fill in:
#   SMTP_USER=your@gmail.com
#   SMTP_PASSWORD=your-app-password
#   ALERT_EMAIL=recipient@example.com

# Start the API server
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

### 3. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/items` | List all monitored items |
| `POST` | `/items` | Add a new item |
| `PUT` | `/items/{id}` | Update item (name, url, target price, interval, active) |
| `DELETE` | `/items/{id}` | Remove an item |
| `POST` | `/items/{id}/scrape-now` | Trigger an immediate scrape |
| `GET` | `/prices/{id}` | Get price history for an item |

---

## Email Alerts

Alerts require a Gmail App Password (not your regular Gmail password).

1. Enable 2-Step Verification on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate a password for "Mail"
4. Use that password as `SMTP_PASSWORD` in your `.env`

An alert fires when `current_price ≤ target_price`, with a 1-hour cooldown per item.

---

## Running Tests

### Backend

```bash
cd backend
source venv/bin/activate   # Windows: venv\Scripts\activate
python -m pytest tests/ -v
```

Covers: price parsing (scraper), ORM storage + cascade delete, scheduler logic (`_is_due`, `_maybe_send_alert`), and FastAPI endpoints (GET / POST / DELETE).

### Frontend

```bash
cd frontend
npm test -- --run
```

Covers: `ItemTable` price color logic + empty state, `AddItemForm` validation + submission, `PriceHistoryPanel` empty/populated states.

---

## Notes

- Amazon actively detects bots. If prices aren't scraping, check the backend logs — you may be hitting a CAPTCHA. Try reducing scrape frequency (`check_interval_minutes`).
- The SQLite database file (`price_monitor.db`) is created automatically on first run inside `backend/`.
- The scheduler checks all active items every minute but respects each item's individual `check_interval_minutes`.

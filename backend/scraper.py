import asyncio
import re
import random
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

_stealth = Stealth()

# Tried in order — Amazon changes DOM layout frequently
AMAZON_PRICE_SELECTORS = [
    "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
    "#corePrice_feature_div .a-price .a-offscreen",
    "#apex_desktop_newAccordionRow .a-price .a-offscreen",
    ".a-price[data-a-color='price'] .a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".a-price .a-offscreen",
]

# Critical: AutomationControlled tells Chrome to hide webdriver signals
LAUNCH_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-infobars",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
]

# Injected before every page load to mask automation fingerprints
STEALTH_INIT_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = { runtime: {} };
"""


async def scrape_amazon_price(url: str) -> float | None:
    async with async_playwright() as p:
        # Real Chrome is far less detectable than bundled Chromium — fall back if not installed
        try:
            browser = await p.chromium.launch(headless=True, channel="chrome", args=LAUNCH_ARGS)
        except Exception:
            browser = await p.chromium.launch(headless=True, args=LAUNCH_ARGS)

        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="en-US",
            timezone_id="America/New_York",
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            },
        )
        await context.add_init_script(STEALTH_INIT_SCRIPT)

        page = await context.new_page()
        await _stealth.apply_stealth_async(page)

        try:
            # "load" waits for all resources, giving JS more time to render price elements
            await page.goto(url, wait_until="load", timeout=30000)

            # Scroll to trigger any lazy-loaded content
            await page.evaluate("window.scrollBy(0, 400)")
            await asyncio.sleep(random.uniform(1, 2))

            # Wait up to 8s for any known price container to appear in the DOM
            PRICE_WAIT_SELECTOR = (
                "#corePriceDisplay_desktop_feature_div, "
                "#corePrice_feature_div, "
                "#priceblock_ourprice, "
                "#priceblock_dealprice, "
                "span.a-price-whole"
            )
            try:
                await page.wait_for_selector(PRICE_WAIT_SELECTOR, timeout=8000)
            except Exception:
                print("[scraper] Price container not found within 8s, attempting extraction anyway")

            title = await page.title()
            print(f"[scraper] Page title: {title}")

            # Bail early if Amazon served a bot-check page
            if any(kw in title.lower() for kw in ("robot", "captcha", "sorry", "blocked")):
                print(f"[scraper] Bot-check page detected: {title}")
                return None

            # Layer 1: standard CSS selectors
            for selector in AMAZON_PRICE_SELECTORS:
                try:
                    el = await page.query_selector(selector)
                    if el:
                        text = await el.text_content()
                        price = _parse_price(text)
                        if price:
                            print(f"[scraper] Found via selector '{selector}': ${price}")
                            return price
                except Exception:
                    continue

            # Layer 2: construct from split whole/fraction spans
            price = await _price_from_parts(page)
            if price:
                print(f"[scraper] Found via parts: ${price}")
                return price

            # Layer 3: JS scan of every .a-offscreen element on the page
            price = await _js_price_scan(page)
            if price:
                print(f"[scraper] Found via JS scan: ${price}")
                return price

            print(f"[scraper] No price found on page: {title}")
            return None

        except Exception as e:
            print(f"[scraper] Error fetching {url}: {e}")
            return None
        finally:
            await browser.close()


async def _price_from_parts(page) -> float | None:
    """Amazon often renders price as two separate spans: whole dollars + cents."""
    try:
        whole_el = await page.query_selector("span.a-price-whole")
        frac_el = await page.query_selector("span.a-price-fraction")
        if whole_el:
            whole = re.sub(r"[^\d]", "", (await whole_el.text_content() or ""))
            frac = re.sub(r"[^\d]", "", (await frac_el.text_content() or "00")) if frac_el else "00"
            if whole:
                return float(f"{whole}.{frac.zfill(2)}")
    except Exception:
        pass
    return None


async def _js_price_scan(page) -> float | None:
    """Last-resort: scan all elements with .a-offscreen for a $X.XX pattern via JS."""
    try:
        result = await page.evaluate("""
            () => {
                for (const el of document.querySelectorAll('.a-offscreen, [class*="price"]')) {
                    const m = el.textContent.trim().match(/\\$([\\d,]+\\.\\d{2})/);
                    if (m) return m[1].replace(/,/g, '');
                }
                return null;
            }
        """)
        if result:
            return float(result)
    except Exception:
        pass
    return None


def _parse_price(text: str | None) -> float | None:
    if not text:
        return None
    cleaned = re.sub(r"[^\d.]", "", text.strip())
    parts = cleaned.split(".")
    if len(parts) > 2:
        cleaned = parts[-2] + "." + parts[-1]
    try:
        value = float(cleaned)
        return value if value > 0 else None
    except ValueError:
        return None

"""
Tests for scraper._parse_price — pure function, no browser needed.
Catches regressions in price string parsing logic.
"""
from scraper import _parse_price


def test_parse_standard_price():
    assert _parse_price("$99.99") == 99.99


def test_parse_price_with_comma():
    # Amazon often shows "$1,299.00" for expensive items
    assert _parse_price("$1,299.00") == 1299.0


def test_parse_whitespace_trimmed():
    assert _parse_price("  $45.67  ") == 45.67


def test_parse_none_returns_none():
    assert _parse_price(None) is None


def test_parse_empty_string_returns_none():
    assert _parse_price("") is None


def test_parse_zero_returns_none():
    # Zero is not a valid price — treat as missing
    assert _parse_price("$0.00") is None


def test_parse_offscreen_span_text():
    # .a-offscreen elements often contain "$X.XX" with no extra symbols
    assert _parse_price("149.99") == 149.99

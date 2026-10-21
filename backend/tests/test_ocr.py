"""
Tests for services/ocr.py

Azure is never called — the saved JSON fixtures are used instead.
This preserves the free-tier quota (500 pages/month).
"""

import json
from decimal import Decimal
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from azure.ai.documentintelligence.models import AnalyzeResult

from app.services.ocr import OcrResult, analyze_receipt, parse_tnd

FIXTURES = Path(__file__).parent / "fixtures" / "receipts"


# ── helpers ──────────────────────────────────────────────────

def load_fixture(name: str) -> AnalyzeResult:
    data = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    return AnalyzeResult(data)


def mock_analyze(fixture_name: str) -> OcrResult:
    """Call analyze_receipt with a mocked Azure client returning a fixture."""
    fake_result = load_fixture(fixture_name)
    mock_poller = MagicMock()
    mock_poller.result.return_value = fake_result

    with patch("app.services.ocr.DocumentIntelligenceClient") as MockClient:
        MockClient.return_value.begin_analyze_document.return_value = mock_poller
        return analyze_receipt(b"fake-image-bytes")


# ── parse_tnd ─────────────────────────────────────────────────

class TestParseTnd:
    def test_dot_decimal(self):
        assert parse_tnd("7.000") == Decimal("7.000")

    def test_comma_decimal(self):
        assert parse_tnd("12,500") == Decimal("12.500")

    def test_dot_thousands_comma_decimal(self):
        # 1.250,000 → 1250.000
        assert parse_tnd("1.250,000") == Decimal("1250.000")

    def test_space_thousands(self):
        assert parse_tnd("1 250,000") == Decimal("1250.000")

    def test_no_decimal(self):
        assert parse_tnd("16") == Decimal("16.000")

    def test_with_currency_suffix(self):
        # "24,500 DT" — suffix is stripped
        assert parse_tnd("24,500 DT") == Decimal("24.500")

    def test_two_decimal_places(self):
        # French receipt: "91,00"
        assert parse_tnd("91,00") == Decimal("91.000")

    def test_invalid_raises(self):
        with pytest.raises(ValueError):
            parse_tnd("no numbers here")


# ── analyze_receipt — ticket1 (French restaurant) ─────────────

class TestTicket1:
    def setup_method(self):
        self.result = mock_analyze("ticket1.json")

    def test_returns_ocr_result(self):
        assert isinstance(self.result, OcrResult)

    def test_items_found(self):
        assert len(self.result.items) == 11

    def test_items_have_decimal_prices(self):
        for item in self.result.items:
            assert isinstance(item.total_price, Decimal)

    def test_date_extracted(self):
        assert self.result.purchased_at is not None
        assert self.result.purchased_at.year == 2018

    def test_total_extracted(self):
        assert self.result.printed_total == Decimal("91.000")

    def test_raw_text_present(self):
        assert len(self.result.raw_text) > 0


# ── analyze_receipt — ticket2 (Tunisian receipt, TND) ─────────

class TestTicket2:
    def setup_method(self):
        self.result = mock_analyze("ticket2.json")

    def test_total_is_not_16000(self):
        # The Azure float would be 16000.0 — we must read from text content
        assert self.result.printed_total == Decimal("16.000")
        assert self.result.printed_total < Decimal("100")

    def test_items_prices_are_millimes(self):
        prices = [item.total_price for item in self.result.items]
        # All prices should be < 100 TND, not thousands
        for price in prices:
            assert price < Decimal("100"), f"Price looks wrong: {price}"

    def test_date_extracted(self):
        assert self.result.purchased_at is not None
        assert self.result.purchased_at.year == 2026


# ── analyze_receipt — ticket3 (PAUL bakery, TND) ──────────────

class TestTicket3:
    def setup_method(self):
        self.result = mock_analyze("ticket3.json")

    def test_total_is_24_500(self):
        assert self.result.printed_total == Decimal("24.500")

    def test_items_count(self):
        assert len(self.result.items) == 4

    def test_computed_total_matches_printed(self):
        computed = sum(item.total_price for item in self.result.items)
        assert computed == self.result.printed_total

    def test_quantity_parsed(self):
        # TARTELETTE has quantity 1
        tartelette = next(i for i in self.result.items if "TARTELETTE" in i.name)
        assert tartelette.quantity == Decimal("1.000")


# ── error handling ────────────────────────────────────────────

class TestErrorHandling:
    def test_missing_credentials_raises_runtime_error(self, monkeypatch):
        monkeypatch.setattr("app.services.ocr.settings.azure_di_endpoint", "")
        monkeypatch.setattr("app.services.ocr.settings.azure_di_key", "")
        with pytest.raises(RuntimeError, match="not configured"):
            analyze_receipt(b"any")

    def test_401_raises_permission_error(self):
        from azure.core.exceptions import HttpResponseError
        from azure.core.pipeline.transport import HttpResponse as CoreHttpResponse

        err = HttpResponseError()
        err.status_code = 401
        err.error = MagicMock()
        err.error.code = "401"
        err.error.message = "Access denied"

        with patch("app.services.ocr.DocumentIntelligenceClient") as MockClient:
            MockClient.return_value.begin_analyze_document.side_effect = err
            with pytest.raises(PermissionError):
                analyze_receipt(b"any")

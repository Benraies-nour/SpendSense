"""
Tests for services/extraction.py

Groq is never called — responses are mocked.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from app.services.extraction import ExtractedItem, extract_items_from_text


def mock_groq_response(content: str):
    """Return a mock Groq response with the given JSON content."""
    choice = MagicMock()
    choice.message.content = content
    response = MagicMock()
    response.choices = [choice]
    return response


def run_extraction(raw_text: str, groq_json: str) -> list[ExtractedItem]:
    with patch("app.services.extraction.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = mock_groq_response(groq_json)
        return extract_items_from_text(raw_text)


class TestExtractItemsFromText:

    def test_basic_extraction(self):
        items = run_extraction(
            "Pain 0,850\nLait 2,400",
            '[{"name": "Pain", "total_price": "0,850"}, {"name": "Lait", "total_price": "2,400"}]',
        )
        assert len(items) == 2
        assert items[0].name == "Pain"
        assert items[0].total_price == Decimal("0.850")
        assert items[1].total_price == Decimal("2.400")

    def test_quantity_parsed(self):
        items = run_extraction(
            "Lait 2x 4,800",
            '[{"name": "Lait", "quantity": "2", "total_price": "4,800"}]',
        )
        assert items[0].quantity == Decimal("2.000")

    def test_llm_wraps_in_dict(self):
        # LLM sometimes returns {"items": [...]} instead of [...]
        items = run_extraction(
            "Pain 0,850",
            '{"items": [{"name": "Pain", "total_price": "0,850"}]}',
        )
        assert len(items) == 1
        assert items[0].name == "Pain"

    def test_empty_text_returns_empty(self):
        # No Groq call should be made for short text
        items = extract_items_from_text("  ")
        assert items == []

    def test_invalid_json_returns_empty(self):
        items = run_extraction("some text", "not json at all")
        assert items == []

    def test_items_without_price_are_skipped(self):
        items = run_extraction(
            "Pain complet  ---\nLait entier  2,400",   # > 10 chars so the guard passes
            '[{"name": "Pain complet"}, {"name": "Lait entier", "total_price": "2,400"}]',
        )
        assert len(items) == 1
        assert items[0].name == "Lait entier"

    def test_items_without_name_are_skipped(self):
        items = run_extraction(
            "? 2,400",
            '[{"name": "", "total_price": "2,400"}]',
        )
        assert items == []

    def test_missing_groq_key_raises(self, monkeypatch):
        monkeypatch.setattr("app.services.extraction.settings.groq_api_key", "")
        with pytest.raises(RuntimeError, match="GROQ_API_KEY"):
            extract_items_from_text("Pain 0,850")

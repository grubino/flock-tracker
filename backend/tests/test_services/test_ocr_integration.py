import pytest
import os
from pathlib import Path
from app.services.ocr_layout_service import OCRLayoutService
from app.services.ocr_service import OCRService


# Path to test fixtures
FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
SAMPLE_RECEIPT_PATH = FIXTURES_DIR / "receipt.png"


@pytest.mark.skipif(
    not SAMPLE_RECEIPT_PATH.exists(),
    reason="Sample receipt image not found. Run tests/fixtures/create_sample_receipt.py to generate it.",
)
class TestOCRIntegration:
    """Integration tests using actual receipt images"""

    def test_extract_text_from_sample_receipt(self):
        """Test basic text extraction from sample receipt"""
        text = OCRService.extract_text(str(SAMPLE_RECEIPT_PATH), "image/jpeg")

        # Should extract the store name
        assert text is not None
        assert len(text) > 0
        # The exact text may vary depending on OCR accuracy, so we check for key elements
        text_lower = text.lower()
        assert (
            "walmart" in text_lower
            or "supercenter" in text_lower
            or "total" in text_lower
            or "receipt" in text_lower  # Generic fallback
        )

    def test_parse_receipt_from_sample_image(self):
        """Test full receipt parsing from sample image"""
        known_vendors = ["Walmart", "Target", "Costco"]
        result = OCRService.parse_receipt(
            OCRService.extract_text(str(SAMPLE_RECEIPT_PATH), "image/jpeg"),
            known_vendors,
        )

        # Should have basic structure
        assert "vendor" in result
        assert "items" in result
        assert "total" in result
        assert "date" in result

    def test_layout_service_get_layout_data(self):
        """Test extracting layout data from sample receipt"""
        df = OCRLayoutService.get_layout_data(str(SAMPLE_RECEIPT_PATH), "image/jpeg")

        # Should return a DataFrame with expected columns
        assert df is not None
        assert "text" in df.columns
        assert "conf" in df.columns
        assert "left" in df.columns
        assert "top" in df.columns
        assert "width" in df.columns
        assert "height" in df.columns

        # Should have detected some text
        assert len(df) > 0

    def test_layout_service_parse_receipt(self):
        """Test layout-based receipt parsing with sample image"""
        known_vendors = ["Walmart", "Target", "Costco"]
        result = OCRLayoutService.parse_receipt_with_layout(
            str(SAMPLE_RECEIPT_PATH), "image/jpeg", known_vendors
        )

        # Should have basic structure
        assert "vendor" in result
        assert "items" in result
        assert "total" in result
        assert "date" in result
        assert "confidence" in result
        assert "layout_info" in result

        # Layout info should have metadata
        assert "total_lines" in result["layout_info"]
        assert "header_lines" in result["layout_info"]
        assert "footer_lines" in result["layout_info"]
        assert "detected_items" in result["layout_info"]

        # Should detect some structure
        assert result["layout_info"]["total_lines"] > 0

    def test_layout_service_detects_items(self):
        """Test that layout service can detect line items from sample receipt"""
        result = OCRLayoutService.parse_receipt_with_layout(
            str(SAMPLE_RECEIPT_PATH), "image/jpeg", []
        )

        # Should detect at least some items
        # Note: OCR accuracy may vary, so we just check that it attempted to find items
        assert "items" in result
        assert isinstance(result["items"], list)

        # If items were detected, they should have the right structure
        for item in result["items"]:
            assert "description" in item
            assert "amount" in item
            assert "confidence" in item
            assert "position" in item

    def test_layout_service_confidence_scores(self):
        """Test that layout service includes confidence scores"""
        result = OCRLayoutService.parse_receipt_with_layout(
            str(SAMPLE_RECEIPT_PATH), "image/jpeg", []
        )

        # Should have overall confidence
        assert "confidence" in result
        assert isinstance(result["confidence"], (int, float))
        assert 0 <= result["confidence"] <= 100

    def test_compare_basic_vs_layout_ocr(self):
        """Compare results between basic OCR and layout-based OCR"""
        known_vendors = ["Walmart"]

        # Basic OCR
        text = OCRService.extract_text(str(SAMPLE_RECEIPT_PATH), "image/jpeg")
        basic_result = OCRService.parse_receipt(text, known_vendors)

        # Layout-based OCR
        layout_result = OCRLayoutService.parse_receipt_with_layout(
            str(SAMPLE_RECEIPT_PATH), "image/jpeg", known_vendors
        )

        # Both should return results with the same structure
        assert set(basic_result.keys()) == {"vendor", "items", "total", "date"}
        assert "vendor" in layout_result
        assert "items" in layout_result
        assert "total" in layout_result
        assert "date" in layout_result

        # Layout service provides additional metadata
        assert "confidence" in layout_result
        assert "layout_info" in layout_result

    def test_file_path_validation(self):
        """Test that OCR service handles invalid file paths gracefully"""
        with pytest.raises(Exception):
            OCRService.extract_text("/nonexistent/path.jpg", "image/jpeg")

    def test_invalid_file_type(self):
        """Test that OCR service handles invalid file types"""
        with pytest.raises(ValueError):
            OCRService.extract_text(str(SAMPLE_RECEIPT_PATH), "application/json")


@pytest.fixture(scope="module")
def ensure_sample_receipt_exists():
    """Fixture to ensure sample receipt exists before running tests"""
    if not SAMPLE_RECEIPT_PATH.exists():
        # Try to create it
        create_script = FIXTURES_DIR / "create_sample_receipt.py"
        if create_script.exists():
            import subprocess

            subprocess.run(["python", str(create_script)], cwd=str(FIXTURES_DIR))

    return SAMPLE_RECEIPT_PATH.exists()

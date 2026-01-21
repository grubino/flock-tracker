"""
OCR Service Router - Centralized OCR engine selection and execution

This module provides a unified interface for selecting and executing different OCR engines.
It eliminates duplicate if/else logic across the codebase.
"""
import logging
from typing import Tuple, Dict, Any

from app.services.ocr_service import OCRService
from app.services.ocr_layout_service import OCRLayoutService
from app.services.ocr_easyocr_service import OCREasyOCRService
from app.services.ocr_got_service import OCRGOTService
from app.services.ocr_chandra_service import OCRChandraService
from app.services.ocr_paddle_service import OCRPaddleService
from app.services.ocr_donut_service import OCRDonutService

logger = logging.getLogger(__name__)


class OCRServiceRouter:
    """
    Router for selecting and executing OCR engines based on engine name.

    Supported engines:
    - tesseract (default): Uses Tesseract OCR with layout service
    - easyocr: Uses EasyOCR
    - got-ocr: Uses GOT-OCR2_0
    - chandra: Uses Chandra OCR
    - paddleocr: Uses PaddleOCR
    - donut: Uses Donut document understanding transformer
    """

    SUPPORTED_ENGINES = ["tesseract", "easyocr", "got-ocr", "chandra", "paddleocr", "donut"]

    @classmethod
    def _validate_and_sanitize_result(cls, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and sanitize OCR result to ensure it conforms to the schema.

        Ensures all values in items list are strings, not nested objects.

        Args:
            extracted_data: Raw extracted data from OCR service

        Returns:
            Sanitized data with all values as strings
        """
        sanitized = extracted_data.copy()

        # Ensure items is a list of flat dictionaries with string values
        if "items" in sanitized and isinstance(sanitized["items"], list):
            sanitized_items = []
            for item in sanitized["items"]:
                if isinstance(item, dict):
                    sanitized_item = {}
                    for key, value in item.items():
                        # Convert any non-string values to strings
                        if isinstance(value, (dict, list)):
                            logger.warning(f"Found nested object in item[{key}]: {value}. Converting to string.")
                            sanitized_item[key] = str(value)
                        elif value is None:
                            sanitized_item[key] = ""
                        else:
                            sanitized_item[key] = str(value)
                    sanitized_items.append(sanitized_item)
                else:
                    logger.warning(f"Found non-dict item: {item}. Skipping.")
            sanitized["items"] = sanitized_items

        # Ensure other fields are strings or None
        for field in ["vendor", "total", "date"]:
            if field in sanitized:
                if isinstance(sanitized[field], (dict, list)):
                    logger.warning(f"Found nested object in {field}: {sanitized[field]}. Converting to string.")
                    sanitized[field] = str(sanitized[field])
                elif sanitized[field] is not None:
                    sanitized[field] = str(sanitized[field])

        return sanitized

    @classmethod
    def validate_engine(cls, ocr_engine: str) -> bool:
        """
        Validate that the OCR engine is supported.

        Args:
            ocr_engine: The name of the OCR engine to validate

        Returns:
            True if the engine is supported, False otherwise
        """
        return ocr_engine in cls.SUPPORTED_ENGINES

    @classmethod
    def process_receipt(
        cls,
        ocr_engine: str,
        file_path: str,
        file_type: str,
        known_vendor_names: list = None
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Process a receipt using the specified OCR engine.

        Args:
            ocr_engine: The OCR engine to use ("tesseract", "easyocr", "got-ocr", "chandra", "paddleocr", or "donut")
            file_path: Path to the receipt file
            file_type: MIME type of the file
            known_vendor_names: List of known vendor names for matching (optional)

        Returns:
            Tuple of (raw_text, extracted_data)
            - raw_text: The raw OCR text extracted from the receipt
            - extracted_data: Dictionary containing parsed receipt data

        Raises:
            ValueError: If the OCR engine is not supported
        """
        if known_vendor_names is None:
            known_vendor_names = []

        if not cls.validate_engine(ocr_engine):
            raise ValueError(
                f"Invalid OCR engine '{ocr_engine}'. "
                f"Supported engines: {', '.join(cls.SUPPORTED_ENGINES)}"
            )

        logger.info(f"Processing receipt with {ocr_engine} OCR engine")

        # Route to the appropriate OCR service
        if ocr_engine == "easyocr":
            extracted_data = OCREasyOCRService.parse_receipt_with_easyocr(
                file_path, file_type, known_vendor_names
            )
            # EasyOCR doesn't return separate raw_text, construct it from items
            raw_text = "\n".join(
                [item["description"] for item in extracted_data.get("items", [])]
            )

        elif ocr_engine == "got-ocr":
            extracted_data = OCRGOTService.parse_receipt_with_got_ocr(
                file_path,
                file_type,
                known_vendor_names,
                ocr_type="format",
            )
            raw_text = extracted_data.get("raw_text", "")

        elif ocr_engine == "chandra":
            extracted_data = OCRChandraService.parse_receipt_with_chandra(
                file_path,
                file_type,
                known_vendor_names,
                output_format="markdown",
            )
            raw_text = extracted_data.get("raw_text", "")

        elif ocr_engine == "paddleocr":
            extracted_data = OCRPaddleService.parse_receipt_with_paddle(
                file_path,
                file_type,
                known_vendor_names,
            )
            raw_text = extracted_data.get("raw_text", "")

        elif ocr_engine == "donut":
            extracted_data = OCRDonutService.parse_receipt_with_donut(
                file_path,
                file_type,
                known_vendor_names,
            )
            raw_text = extracted_data.get("raw_text", "")

        else:  # tesseract (default)
            raw_text = OCRService.extract_text(file_path, file_type)
            extracted_data = OCRLayoutService.parse_receipt_with_layout(
                file_path, file_type, known_vendor_names
            )
            extracted_data["ocr_engine"] = "tesseract"

        # Validate and sanitize the result before returning
        extracted_data = cls._validate_and_sanitize_result(extracted_data)

        return raw_text, extracted_data

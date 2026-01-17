"""
OCR Service using PaddleOCR for receipt parsing
PaddleOCR provides high-accuracy text recognition with support for 100+ languages
"""

import logging
from typing import Dict, List, Optional
from decimal import Decimal
import re
import os
from PIL import Image
from pdf2image import convert_from_path
import tempfile

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class OCRPaddleService:
    """OCR service using PaddleOCR for receipt parsing"""

    _ocr = None

    @classmethod
    def _initialize_model(cls):
        """Lazy initialization of PaddleOCR model"""
        if cls._ocr is None:
            try:
                logger.info("Initializing PaddleOCR model...")
                # Disable oneDNN/MKL-DNN to avoid PIR attribute conversion errors
                # on certain CPU configurations
                from paddleocr import PaddleOCR

                # Initialize PaddleOCR with English language, CPU mode
                # Match CLI defaults for better quality results
                cls._ocr = PaddleOCR(
                    ocr_version="PP-OCRv5",
                    lang="en",
                    device="cpu",
                    enable_mkldnn=False,
                    # Document preprocessing (enabled by default in CLI)
                    use_doc_orientation_classify=True,  # Detect and correct document orientation
                    use_doc_unwarping=True,  # Correct perspective distortion
                    use_textline_orientation=True,  # Handle text at various angles
                )
                logger.info("PaddleOCR model initialized successfully")
            except ImportError as e:
                logger.error(f"Failed to import paddleocr: {e}")
                logger.error("Install with: pip install paddleocr")
                raise
            except Exception as e:
                logger.error(f"Failed to initialize PaddleOCR model: {e}")
                raise

    @classmethod
    def extract_text_from_image(cls, image_path: str) -> str:
        """
        Extract text from image using PaddleOCR

        Args:
            image_path: Path to the image file

        Returns:
            Extracted text as a string
        """
        cls._initialize_model()

        try:
            logger.info(f"PaddleOCR: Processing image {image_path}...")

            # Run OCR
            result = OCRPaddleService._ocr.predict(image_path)

            if not result or len(result) == 0:
                logger.warning("PaddleOCR returned no results")
                return ""

            # Extract text from results
            # PP-OCRv5 returns list of OCRResult dicts with rec_texts and rec_scores
            lines = []
            for ocr_result in result:
                if ocr_result is None:
                    continue
                # Access rec_texts list directly from the OCRResult dict
                rec_texts = ocr_result.get("rec_texts", [])
                rec_scores = ocr_result.get("rec_scores", [])
                for text, score in zip(rec_texts, rec_scores):
                    if text and score >= 0.5:  # Filter low-confidence results
                        lines.append(text)

            result_text = "\n".join(lines)
            logger.info(
                f"PaddleOCR: Extraction complete, text length: {len(result_text)}"
            )
            return result_text

        except Exception as e:
            logger.error(f"Error extracting text with PaddleOCR: {str(e)}")
            raise

    @classmethod
    def parse_receipt_with_paddle(
        cls,
        file_path: str,
        file_type: str,
        known_vendor_names: List[str] = None,
    ) -> Dict:
        """
        Parse receipt using PaddleOCR

        Args:
            file_path: Path to the receipt file
            file_type: MIME type of the file
            known_vendor_names: List of known vendor names for matching

        Returns:
            Dictionary with extracted receipt data
        """
        if known_vendor_names is None:
            known_vendor_names = []

        try:
            # Handle PDF files
            if file_type == "application/pdf":
                logger.info("Converting PDF to image for PaddleOCR processing...")
                images = convert_from_path(file_path, first_page=1, last_page=1)
                if not images:
                    raise ValueError("Could not convert PDF to image")

                # Save first page as temporary image
                temp_image = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                images[0].save(temp_image.name, "PNG")
                image_path = temp_image.name
            else:
                image_path = file_path

            # Extract text using PaddleOCR
            raw_text = cls.extract_text_from_image(image_path)

            # Clean up temp file if we created one
            if file_type == "application/pdf" and image_path != file_path:
                try:
                    os.unlink(image_path)
                except:
                    pass

            # Parse the extracted text into structured data
            parsed_data = cls._parse_text_to_receipt_data(raw_text, known_vendor_names)

            # Add raw text and OCR engine to the result
            parsed_data["raw_text"] = raw_text
            parsed_data["ocr_engine"] = "paddleocr"

            return parsed_data

        except Exception as e:
            logger.error(
                f"Error parsing receipt with PaddleOCR: {str(e)}", exc_info=True
            )
            raise

    @classmethod
    def _parse_text_to_receipt_data(
        cls, text: str, known_vendor_names: List[str]
    ) -> Dict:
        """
        Parse extracted text into structured receipt data

        Args:
            text: Raw text extracted by PaddleOCR
            known_vendor_names: List of known vendor names for matching

        Returns:
            Dictionary with structured receipt data
        """
        # Initialize result structure
        result = {"vendor_name": None, "total": None, "date": None, "items": []}

        # Extract vendor name (look for known vendors first)
        for vendor in known_vendor_names:
            if vendor.lower() in text.lower():
                result["vendor_name"] = vendor
                break

        # If no known vendor found, try to extract from first lines
        if not result["vendor_name"]:
            lines = text.split("\n")
            for line in lines[:5]:  # Check first 5 lines
                line = line.strip()
                if len(line) > 2 and not any(char.isdigit() for char in line):
                    result["vendor_name"] = line
                    break

        # Extract total amount
        # Look for patterns like "Total: $XX.XX" or "TOTAL XX.XX"
        total_patterns = [
            r"total[:\s]+\$?\s*(\d+[.,]\d{2})",
            r"amount[:\s]+\$?\s*(\d+[.,]\d{2})",
            r"balance[:\s]+\$?\s*(\d+[.,]\d{2})",
            r"grand\s*total[:\s]+\$?\s*(\d+[.,]\d{2})",
        ]

        for pattern in total_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(",", ".")
                try:
                    result["total"] = float(amount_str)
                    break
                except ValueError:
                    pass

        # Extract date
        # Look for common date patterns
        date_patterns = [
            r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
            r"(\d{4}[-/]\d{1,2}[-/]\d{1,2})",
            r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}",
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result["date"] = match.group(0)
                break

        # Extract line items (look for patterns with amounts)
        lines = text.split("\n")
        for line in lines:
            # Look for lines with amounts (e.g., "Item name ... $XX.XX" or "Item $X.XX")
            amount_match = re.search(r"\$?\s*(\d+[.,]\d{2})\s*$", line)
            if amount_match:
                amount_str = amount_match.group(1).replace(",", ".")
                try:
                    amount = float(amount_str)
                    # Extract description (everything before the amount)
                    description = line[: amount_match.start()].strip()
                    description = re.sub(
                        r"\s+", " ", description
                    )  # Normalize whitespace

                    if description and len(description) > 1:
                        result["items"].append(
                            {"description": description, "amount": amount}
                        )
                except ValueError:
                    pass

        return result

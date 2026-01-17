"""
OCR Service using stepfun-ai/GOT-OCR2_0 model for receipt parsing
This model provides excellent OCR results without preprocessing
"""

import logging
from typing import Dict, List, Optional
from decimal import Decimal
import re
import os
from PIL import Image
from pdf2image import convert_from_path
from transformers import AutoModelForImageTextToText, AutoProcessor
import torch

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class OCRGOTService:
    """OCR service using GOT-OCR2_0 model with format mode for receipt parsing"""

    _model = None
    _processor = None
    _device = "cpu"

    @classmethod
    def _initialize_model(cls):
        """Lazy initialization of GOT-OCR2_0 model"""
        if cls._model is None:
            logger.info("Initializing GOT-OCR2_0 model...")

            # Load model and tokenizer
            model_name = "stepfun-ai/GOT-OCR-2.0-hf"
            cls._processor = AutoProcessor.from_pretrained(
                model_name, trust_remote_code=True, device_map=cls._device
            )

            cls._model = AutoModelForImageTextToText.from_pretrained(
                model_name, trust_remote_code=True
            )

            cls._model.eval()

            logger.info("GOT-OCR2_0 model initialized successfully")

    @classmethod
    def extract_text_from_image(cls, image_path: str, ocr_type: str = "format") -> str:
        """
        Extract text from image using GOT-OCR2_0

        Args:
            image_path: Path to the image file
            ocr_type: OCR type - 'format' preserves layout (default), 'ocr' for plain text

        Returns:
            Extracted text with layout preserved if ocr_type='format'
        """
        cls._initialize_model()

        try:
            # Run GOT-OCR2_0 inference
            # The model's chat method expects the image path as a string
            logger.info(f"GOT-OCR: Processing image {image_path} with processor...")
            inputs = cls._processor(
                image_path, return_tensors="pt", format=(ocr_type == "format")
            ).to(cls._device)

            logger.info(
                f"GOT-OCR: Running model inference on {cls._device} (this may take several minutes on CPU)..."
            )
            generate_ids = cls._model.generate(
                **inputs,
                do_sample=False,
                tokenizer=cls._processor.tokenizer,
                stop_strings="<|im_end|>",
                max_new_tokens=4096,
            )

            logger.info(f"GOT-OCR: Decoding results...")
            result = cls._processor.decode(
                generate_ids[0, inputs["input_ids"].shape[1] :],
                skip_special_tokens=True,
            )
            logger.info(f"GOT-OCR: Extraction complete, text length: {len(result)}")
            return result

        except Exception as e:
            logger.error(f"Error in GOT-OCR2_0 extraction: {str(e)}")
            raise Exception(f"GOT-OCR2_0 extraction failed: {str(e)}")

    @staticmethod
    def extract_text_from_pdf(pdf_path: str, ocr_type: str = "format") -> str:
        """
        Extract text from PDF by converting to images first

        Args:
            pdf_path: Path to the PDF file
            ocr_type: OCR type - 'format' or 'ocr'

        Returns:
            Extracted text from all pages
        """
        try:
            # Convert PDF to images
            images = convert_from_path(pdf_path)

            # Extract text from each page
            full_text = ""
            for i, image in enumerate(images):
                # Save page as temporary image
                import tempfile

                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=".png"
                ) as temp_file:
                    temp_path = temp_file.name
                    image.save(temp_path, "PNG")

                try:
                    text = OCRGOTService.extract_text_from_image(temp_path, ocr_type)
                    full_text += f"\n--- Page {i+1} ---\n{text}"
                finally:
                    # Clean up temp file
                    try:
                        os.unlink(temp_path)
                    except:
                        pass

            return full_text

        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise Exception(f"Error extracting text from PDF: {str(e)}")

    @staticmethod
    def extract_text(file_path: str, file_type: str, ocr_type: str = "format") -> str:
        """
        Extract text from a file based on its type

        Args:
            file_path: Path to the file
            file_type: MIME type of the file
            ocr_type: OCR type - 'format' or 'ocr'

        Returns:
            Extracted text
        """
        if file_type.startswith("image/"):
            return OCRGOTService.extract_text_from_image(file_path, ocr_type)
        elif file_type == "application/pdf":
            return OCRGOTService.extract_text_from_pdf(file_path, ocr_type)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    @staticmethod
    def find_vendor_name(text: str, known_vendors: List[str]) -> Optional[str]:
        """
        Extract vendor name from receipt text

        Args:
            text: OCR extracted text
            known_vendors: List of known vendor names for fuzzy matching

        Returns:
            Vendor name if found
        """
        from .ocr_nlp_utils import OCRNLPUtils

        # Try fuzzy matching against known vendors
        if known_vendors:
            lines = text.strip().split("\n")
            # Focus on first 10 lines (header region)
            header_text = "\n".join(lines[:10])

            match_result = OCRNLPUtils.fuzzy_match_vendor(
                header_text, known_vendors, threshold=75, context_lines=10
            )
            if match_result:
                return match_result["vendor"]

        # Fallback: extract from first few lines
        lines = text.strip().split("\n")
        for line in lines[:5]:
            line = line.strip()
            # Skip short lines, phone numbers, addresses
            if len(line) < 3:
                continue
            if re.search(r"\d{3}[-.\s]?\d{3}[-.\s]?\d{4}", line):
                continue
            if re.search(
                r"\d+\s+[A-Za-z]+.*\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln)\b",
                line,
                re.IGNORECASE,
            ):
                continue

            # If line looks like a business name
            if len(line.split()) >= 2 or line.isupper():
                return line

        return None

    @staticmethod
    def extract_line_items(text: str) -> List[Dict]:
        """
        Extract line items and prices from receipt text

        Args:
            text: OCR extracted text

        Returns:
            List of dicts with 'description' and 'amount'
        """
        items = []
        lines = text.split("\n")

        # Price patterns - match various formats
        price_patterns = [
            r"(\$\s*\d+[.,]\d{2})",  # $10.99 or $ 10.99
            r"(\d+[.,]\d{2})",  # 10.99
            r"(\$\s*\d+)\b",  # $10
        ]

        for line in lines:
            line = line.strip()
            if not line or len(line) < 3:
                continue

            # Skip lines that are obviously not items
            if line.isdigit() and len(line) > 4:
                continue
            if re.match(r"^[\d\s\-]+$", line):
                continue

            # Try to find price in line
            price_match = None
            for pattern in price_patterns:
                match = re.search(pattern, line)
                if match:
                    price_match = match
                    break

            if price_match:
                price_str = (
                    price_match.group(1)
                    .replace("$", "")
                    .replace(" ", "")
                    .replace(",", ".")
                )

                try:
                    amount = Decimal(price_str)

                    # Reasonable price range
                    if 0.50 <= amount < 10000:
                        # Extract description (before price)
                        description = line[: price_match.start()].strip()

                        # Skip totals, taxes, etc.
                        skip_patterns = [
                            r"\b(total|subtotal|tax|balance|change|sold|items|tend|due|card|payment)\b",
                            r"^\d+$",
                        ]

                        should_skip = False
                        for pattern in skip_patterns:
                            if re.search(pattern, line, re.IGNORECASE):
                                should_skip = True
                                break

                        if not should_skip and description and len(description) > 2:
                            items.append(
                                {"description": description, "amount": str(amount)}
                            )
                except:
                    continue

        return items

    @staticmethod
    def extract_total(text: str) -> Optional[str]:
        """
        Extract total amount from receipt text

        Args:
            text: OCR extracted text

        Returns:
            Total amount as string, or None if not found
        """
        lines = text.split("\n")

        # Look for lines with "total" keyword
        for line in lines:
            if re.search(r"\btotal\b", line, re.IGNORECASE):
                # Extract price from this line
                price_match = re.search(r"\$?\d+[,.]?\d{0,2}", line)
                if price_match:
                    price_str = price_match.group(0).replace("$", "").replace(",", ".")
                    try:
                        total = Decimal(price_str)
                        return str(total)
                    except:
                        continue

        return None

    @staticmethod
    def extract_date(text: str) -> Optional[str]:
        """
        Extract date from receipt text

        Args:
            text: OCR extracted text

        Returns:
            Date in YYYY-MM-DD format if found
        """
        # Common date patterns
        patterns = [
            r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b",  # MM/DD/YYYY or DD/MM/YYYY
            r"\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b",  # YYYY-MM-DD
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                groups = match.groups()

                if len(groups[0]) == 4:  # YYYY-MM-DD format
                    year, month, day = groups
                else:  # MM/DD/YYYY format (US)
                    month, day, year = groups
                    if len(year) == 2:
                        year = f"20{year}"

                try:
                    month_int = int(month)
                    day_int = int(day)
                    if 1 <= month_int <= 12 and 1 <= day_int <= 31:
                        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                except:
                    continue

        return None

    @staticmethod
    def parse_receipt_with_got_ocr(
        image_path: str,
        file_type: str,
        known_vendors: List[str] = [],
        ocr_type: str = "format",
    ) -> Dict:
        """
        Parse receipt using GOT-OCR2_0 model

        Args:
            image_path: Path to the receipt image/PDF
            file_type: MIME type of the file
            known_vendors: List of known vendor names
            ocr_type: OCR type - 'format' (default) or 'ocr'

        Returns:
            Dict with vendor, items, total, date, and metadata
        """
        try:
            # Extract text using GOT-OCR2_0
            text = OCRGOTService.extract_text(image_path, file_type, ocr_type)

            logger.debug(f"GOT-OCR2_0 extracted text:\n{text[:500]}...")

            # Parse receipt data
            vendor = OCRGOTService.find_vendor_name(text, known_vendors)
            items = OCRGOTService.extract_line_items(text)
            total = OCRGOTService.extract_total(text)
            date = OCRGOTService.extract_date(text)

            result = {
                "vendor": vendor,
                "items": items,
                "total": total,
                "date": date,
                "raw_text": text,
                "ocr_engine": "got-ocr2.0",
                "ocr_type": ocr_type,
                "confidence": 95.0,  # GOT-OCR2_0 generally has high confidence
                "layout_info": {
                    "total_lines": len(text.split("\n")),
                    "detected_items": len(items),
                },
            }

            logger.info(
                f"GOT-OCR2_0 parsed receipt: vendor={vendor}, items={len(items)}, total={total}"
            )

            return result

        except Exception as e:
            logger.error(f"Error parsing receipt with GOT-OCR2_0: {str(e)}")
            raise Exception(f"GOT-OCR2_0 parsing failed: {str(e)}")

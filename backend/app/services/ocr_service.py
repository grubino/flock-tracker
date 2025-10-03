import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import re
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
import tempfile
import os


class OCRService:
    """Service for extracting text and data from receipt images using Tesseract OCR"""

    @staticmethod
    def extract_text_from_image(image_path: str) -> str:
        """Extract text from an image file using OCR"""
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)
            return text
        except Exception as e:
            raise Exception(f"Error extracting text from image: {str(e)}")

    @staticmethod
    def extract_text_from_pdf(pdf_path: str) -> str:
        """Extract text from a PDF file by converting to images first"""
        try:
            # Convert PDF to images
            images = convert_from_path(pdf_path)

            # Extract text from each page
            full_text = ""
            for i, image in enumerate(images):
                text = pytesseract.image_to_string(image)
                full_text += f"\n--- Page {i+1} ---\n{text}"

            return full_text
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")

    @staticmethod
    def extract_text(file_path: str, file_type: str) -> str:
        """Extract text from a file based on its type"""
        if file_type.startswith('image/'):
            return OCRService.extract_text_from_image(file_path)
        elif file_type == 'application/pdf':
            return OCRService.extract_text_from_pdf(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    @staticmethod
    def find_vendor_name(text: str, known_vendors: List[str]) -> Optional[str]:
        """
        Attempt to identify vendor name from receipt text.
        Checks against known vendors first, then tries to extract from top of receipt.
        """
        text_lower = text.lower()

        # Check against known vendors
        for vendor in known_vendors:
            if vendor.lower() in text_lower:
                return vendor

        # Try to extract vendor from first few lines (usually at top of receipt)
        lines = text.strip().split('\n')
        first_lines = [line.strip() for line in lines[:5] if line.strip()]

        # Look for lines that might be business names (all caps, or title case with multiple words)
        for line in first_lines:
            # Skip lines that look like addresses or phone numbers
            if re.search(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', line):  # Phone number
                continue
            if re.search(r'\d+\s+[A-Za-z]+.*\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln)\b', line, re.IGNORECASE):  # Address
                continue

            # If line is mostly uppercase or title case with 2+ words, might be vendor
            if len(line) > 3 and (line.isupper() or len(line.split()) >= 2):
                return line

        return None

    @staticmethod
    def extract_line_items(text: str) -> List[Dict[str, any]]:
        """
        Extract line items and their prices from receipt text.
        Returns a list of dicts with 'description' and 'amount'.
        """
        items = []
        lines = text.split('\n')

        # Pattern to match lines with prices (e.g., "Item Name 12.99" or "Item Name $12.99")
        # Handles various formats: 12.99, $12.99, 12,99 (European), etc.
        price_pattern = r'(\$?\d+[,.]?\d{0,2})\s*$'

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Look for price at end of line
            match = re.search(price_pattern, line)
            if match:
                price_str = match.group(1).replace('$', '').replace(',', '.')

                # Try to parse as decimal
                try:
                    amount = Decimal(price_str)
                    if amount > 0 and amount < 10000:  # Reasonable range for line items
                        # Extract description (everything before the price)
                        description = line[:match.start()].strip()

                        # Filter out lines that are likely totals or tax
                        if not re.search(r'\b(total|subtotal|tax|balance|change|cash|card|tender)\b', description, re.IGNORECASE):
                            if description:  # Only add if there's a description
                                items.append({
                                    'description': description,
                                    'amount': str(amount)
                                })
                except:
                    continue

        return items

    @staticmethod
    def extract_total(text: str) -> Optional[Decimal]:
        """
        Extract the total amount from receipt text.
        Looks for lines containing 'total' and a price.
        """
        lines = text.split('\n')

        # Look for lines with "total" keyword
        for line in lines:
            if re.search(r'\btotal\b', line, re.IGNORECASE):
                # Extract price from this line
                price_match = re.search(r'\$?\d+[,.]?\d{0,2}', line)
                if price_match:
                    price_str = price_match.group(0).replace('$', '').replace(',', '.')
                    try:
                        return Decimal(price_str)
                    except:
                        continue

        return None

    @staticmethod
    def extract_date(text: str) -> Optional[str]:
        """
        Extract date from receipt text.
        Returns date in YYYY-MM-DD format if found.
        """
        # Common date patterns
        patterns = [
            r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b',  # MM/DD/YYYY or DD/MM/YYYY
            r'\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b',    # YYYY-MM-DD
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                groups = match.groups()

                # Try to parse date
                if len(groups[0]) == 4:  # YYYY-MM-DD format
                    year, month, day = groups
                else:  # MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY (US format)
                    month, day, year = groups
                    if len(year) == 2:
                        year = f"20{year}"

                try:
                    # Basic validation
                    month_int = int(month)
                    day_int = int(day)
                    if 1 <= month_int <= 12 and 1 <= day_int <= 31:
                        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                except:
                    continue

        return None

    @staticmethod
    def parse_receipt(text: str, known_vendors: List[str] = []) -> Dict:
        """
        Parse receipt text and extract structured data.
        Returns a dict with vendor, items, total, and date.
        """
        return {
            'vendor': OCRService.find_vendor_name(text, known_vendors),
            'items': OCRService.extract_line_items(text),
            'total': str(OCRService.extract_total(text)) if OCRService.extract_total(text) else None,
            'date': OCRService.extract_date(text),
        }

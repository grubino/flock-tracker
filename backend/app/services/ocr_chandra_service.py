"""
OCR Service using datalab-to/chandra model for receipt parsing via remote HTTP endpoint
Chandra provides high-accuracy OCR with excellent handling of complex layouts, tables, and forms
"""

import logging
from typing import Dict, List, Optional
from decimal import Decimal
import re
import os
from PIL import Image
from pdf2image import convert_from_path
import tempfile
import httpx

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class OCRChandraService:
    """OCR service using Chandra model via remote HTTP endpoint"""

    # Default Chandra OCR endpoint (can be overridden with CHANDRA_OCR_URL env var)
    _default_endpoint = "https://e42abee2739f.ngrok-free.app/ocr/"

    @classmethod
    def _get_endpoint_url(cls) -> str:
        """Get Chandra OCR endpoint URL from environment or use default"""
        return os.getenv("CHANDRA_OCR_URL", cls._default_endpoint)

    @classmethod
    def extract_text_from_image(
        cls, image_path: str, output_format: str = "markdown"
    ) -> str:
        """
        Extract text from image using Chandra OCR via HTTP endpoint

        Args:
            image_path: Path to the image file
            output_format: Output format (not used with remote endpoint, kept for API compatibility)

        Returns:
            Extracted text from Chandra OCR
        """
        endpoint_url = cls._get_endpoint_url()

        try:
            logger.info(f"Chandra: Sending image to remote endpoint {endpoint_url}...")

            # Read the image file
            with open(image_path, "rb") as f:
                files = {"file": (os.path.basename(image_path), f, "image/jpeg")}

                # Send POST request to Chandra OCR endpoint
                with httpx.Client(timeout=300.0) as client:  # 5 minute timeout
                    response = client.post(endpoint_url, files=files)
                    response.raise_for_status()

                    result = response.json()

                    # Extract text from response
                    if "text" in result:
                        result_text = result["text"]
                    elif "generated_text" in result:
                        result_text = result["generated_text"]
                    elif "error" in result:
                        raise ValueError(
                            f"Chandra OCR error: {result.get('error')} - {result.get('message', '')}"
                        )
                    else:
                        raise ValueError(
                            f"Unexpected response format from Chandra OCR: {result}"
                        )

            logger.info(
                f"Chandra: Extraction complete, text length: {len(result_text)}"
            )
            return result_text

        except httpx.TimeoutException:
            logger.error(f"Chandra OCR request timed out after 300s")
            raise Exception("Chandra OCR request timed out")
        except httpx.HTTPError as e:
            logger.error(f"Chandra OCR HTTP error: {str(e)}")
            raise Exception(f"Chandra OCR HTTP error: {str(e)}")
        except Exception as e:
            logger.error(f"Error extracting text with Chandra: {str(e)}")
            raise

    @classmethod
    def parse_receipt_with_chandra(
        cls,
        file_path: str,
        file_type: str,
        known_vendor_names: List[str] = None,
        output_format: str = "markdown",
    ) -> Dict:
        """
        Parse receipt using Chandra OCR

        Args:
            file_path: Path to the receipt file
            file_type: MIME type of the file
            known_vendor_names: List of known vendor names for matching
            output_format: Output format for Chandra ('markdown', 'html', or 'json')

        Returns:
            Dictionary with extracted receipt data
        """
        if known_vendor_names is None:
            known_vendor_names = []

        try:
            # Handle PDF files
            if file_type == "application/pdf":
                logger.info("Converting PDF to image for Chandra processing...")
                images = convert_from_path(file_path, first_page=1, last_page=1)
                if not images:
                    raise ValueError("Could not convert PDF to image")

                # Save first page as temporary image
                temp_image = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                images[0].save(temp_image.name, "PNG")
                image_path = temp_image.name
            else:
                image_path = file_path

            # Extract text using Chandra
            raw_text = cls.extract_text_from_image(image_path, output_format)

            # Clean up temp file if we created one
            if file_type == "application/pdf" and image_path != file_path:
                try:
                    os.unlink(image_path)
                except:
                    pass

            # Parse the extracted text into structured data
            parsed_data = cls._parse_text_to_receipt_data(raw_text, known_vendor_names)

            # Add raw text to the result
            parsed_data["raw_text"] = raw_text

            return parsed_data

        except Exception as e:
            logger.error(f"Error parsing receipt with Chandra: {str(e)}", exc_info=True)
            raise

    @classmethod
    def _parse_text_to_receipt_data(
        cls, text: str, known_vendor_names: List[str]
    ) -> Dict:
        """
        Parse extracted text into structured receipt data

        Args:
            text: Raw text extracted by Chandra
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
        # This is a simple heuristic - Chandra's markdown format may need custom parsing
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

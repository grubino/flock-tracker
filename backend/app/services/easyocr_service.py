import easyocr
from PIL import Image
from pdf2image import convert_from_path
import numpy as np
from typing import Dict, List, Optional
from decimal import Decimal
from .ocr_nlp_utils import OCRNLPUtils


class EasyOCRService:
    """Service for extracting text and data from receipt images using EasyOCR"""

    # Shared reader instance (lazy loaded)
    _reader = None

    @classmethod
    def get_reader(cls, languages=['en'], gpu=False):
        """Get or create EasyOCR reader instance (reused for performance)"""
        if cls._reader is None:
            cls._reader = easyocr.Reader(languages, gpu=gpu)
        return cls._reader

    @staticmethod
    def extract_text_from_image(
        image_path: str,
        gpu: bool = False,
        paragraph: bool = True,
        x_ths: float = 1.0,
        y_ths: float = 0.5
    ) -> str:
        """
        Extract text from an image file using EasyOCR

        Args:
            image_path: Path to image file
            gpu: Use GPU acceleration
            paragraph: Enable paragraph detection for better layout
            x_ths: Horizontal threshold for paragraph grouping (higher = more aggressive horizontal grouping)
            y_ths: Vertical threshold for paragraph grouping (higher = more aggressive vertical grouping)
        """
        try:
            reader = EasyOCRService.get_reader(gpu=gpu)

            # Read text from image with paragraph detection
            result = reader.readtext(
                image_path,
                paragraph=paragraph,
                x_ths=x_ths,
                y_ths=y_ths
            )

            # Extract just the text (result is list of (bbox, text, confidence))
            text_lines = [detection[1] for detection in result]
            text = '\n'.join(text_lines)

            # Apply NLP cleaning to improve text quality
            text = OCRNLPUtils.clean_ocr_text(text)

            return text
        except Exception as e:
            raise Exception(f"Error extracting text from image: {str(e)}")

    @staticmethod
    def extract_text_from_image_with_confidence(
        image_path: str,
        gpu: bool = False,
        min_confidence: float = 0.0,
        paragraph: bool = True,
        x_ths: float = 1.0,
        y_ths: float = 0.5
    ) -> Dict:
        """
        Extract text with detailed confidence scores and layout information

        Args:
            image_path: Path to image file
            gpu: Use GPU acceleration
            min_confidence: Minimum confidence threshold (0.0-1.0)
            paragraph: Enable paragraph detection for better layout
            x_ths: Horizontal threshold for paragraph grouping
            y_ths: Vertical threshold for paragraph grouping

        Returns:
            Dict with 'text', 'lines' (with confidence), and 'avg_confidence'
        """
        try:
            reader = EasyOCRService.get_reader(gpu=gpu)

            # Read text from image with paragraph detection
            result = reader.readtext(
                image_path,
                paragraph=paragraph,
                x_ths=x_ths,
                y_ths=y_ths
            )

            # Filter by confidence and extract lines
            lines = []
            for bbox, text, confidence in result:
                if confidence >= min_confidence:
                    lines.append({
                        'text': text,
                        'confidence': round(confidence * 100, 2),
                        'bbox': bbox  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                    })

            # Build full text
            full_text = '\n'.join(line['text'] for line in lines)
            full_text = OCRNLPUtils.clean_ocr_text(full_text)

            # Calculate average confidence
            avg_confidence = sum(line['confidence'] for line in lines) / len(lines) if lines else 0

            return {
                'text': full_text,
                'lines': lines,
                'avg_confidence': round(avg_confidence, 2)
            }
        except Exception as e:
            raise Exception(f"Error extracting text from image: {str(e)}")

    @staticmethod
    def extract_text_from_pdf(
        pdf_path: str,
        gpu: bool = False,
        paragraph: bool = True,
        x_ths: float = 1.0,
        y_ths: float = 0.5
    ) -> str:
        """
        Extract text from a PDF file by converting to images first

        Args:
            pdf_path: Path to PDF file
            gpu: Use GPU acceleration
            paragraph: Enable paragraph detection
            x_ths: Horizontal threshold for paragraph grouping
            y_ths: Vertical threshold for paragraph grouping
        """
        try:
            # Convert PDF to images
            images = convert_from_path(pdf_path)

            reader = EasyOCRService.get_reader(gpu=gpu)

            # Extract text from each page
            full_text = ""
            for i, image in enumerate(images):
                # Convert PIL image to numpy array for EasyOCR
                img_array = np.array(image)

                result = reader.readtext(
                    img_array,
                    paragraph=paragraph,
                    x_ths=x_ths,
                    y_ths=y_ths
                )
                text_lines = [detection[1] for detection in result]
                text = '\n'.join(text_lines)

                # Apply NLP cleaning
                text = OCRNLPUtils.clean_ocr_text(text)
                full_text += f"\n--- Page {i+1} ---\n{text}"

            return full_text
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")

    @staticmethod
    def extract_text(file_path: str, file_type: str, gpu: bool = False) -> str:
        """Extract text from a file based on its type"""
        if file_type.startswith('image/'):
            return EasyOCRService.extract_text_from_image(file_path, gpu=gpu)
        elif file_type == 'application/pdf':
            return EasyOCRService.extract_text_from_pdf(file_path, gpu=gpu)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    @staticmethod
    def extract_structured_data(
        image_path: str,
        known_vendors: List[str] = [],
        gpu: bool = False,
        paragraph: bool = True,
        x_ths: float = 1.0,
        y_ths: float = 0.5
    ) -> Dict:
        """
        Extract structured receipt data using EasyOCR with layout information

        Args:
            image_path: Path to receipt image
            known_vendors: List of known vendor names for matching
            gpu: Use GPU acceleration
            paragraph: Enable paragraph detection for better layout preservation
            x_ths: Horizontal threshold (1.0 default - receipts often have items on same line)
            y_ths: Vertical threshold (0.5 default - keep lines separate)

        Returns:
            Dict with parsed receipt data: vendor, items, total, date, confidence
        """
        try:
            reader = EasyOCRService.get_reader(gpu=gpu)

            # Read text with bounding boxes and paragraph detection
            result = reader.readtext(
                image_path,
                paragraph=paragraph,
                x_ths=x_ths,
                y_ths=y_ths
            )

            if not result:
                return {
                    'vendor': None,
                    'items': [],
                    'total': None,
                    'date': None,
                    'confidence': 0
                }

            # Normalize result format - handle both (bbox, text) and (bbox, text, conf) formats
            normalized_result = []
            for item in result:
                if len(item) == 2:
                    # Format: (bbox, text) - no confidence
                    bbox, text = item
                    normalized_result.append((bbox, text, 1.0))  # Default confidence
                elif len(item) == 3:
                    # Format: (bbox, text, confidence)
                    normalized_result.append(item)
                else:
                    continue  # Skip malformed items

            # Sort by vertical position (top to bottom)
            result_sorted = sorted(normalized_result, key=lambda x: x[0][0][1])  # Sort by top-left y coordinate

            # Build full text for general extraction
            full_text = '\n'.join([detection[1] for detection in result_sorted])
            full_text = OCRNLPUtils.clean_ocr_text(full_text)

            # Get header (top 30%)
            image_height = max(bbox[0][1] for bbox, _, _ in result_sorted)
            header_threshold = image_height * 0.3
            header_lines = [text for bbox, text, conf in result_sorted if bbox[0][1] < header_threshold]
            header_text = '\n'.join(header_lines)

            # Find vendor using fuzzy matching
            vendor = None
            if known_vendors:
                match_result = OCRNLPUtils.fuzzy_match_vendor(
                    header_text,
                    known_vendors,
                    threshold=75,
                    context_lines=len(header_lines)
                )
                if match_result:
                    vendor = match_result['vendor']

            # Fallback: use first substantial header line
            if not vendor and header_lines:
                for line in header_lines:
                    if len(line) > 3 and not line.isdigit():
                        vendor = line
                        break

            # Extract line items (simplified - could be enhanced with layout analysis)
            from .ocr_service import OCRService
            items = OCRService.extract_line_items(full_text)

            # Extract total
            total = OCRService.extract_total(full_text)

            # Extract date
            date = OCRService.extract_date(full_text)

            # Calculate average confidence
            avg_confidence = sum(conf for _, _, conf in result_sorted) / len(result_sorted) if result_sorted else 0

            return {
                'vendor': vendor,
                'items': items,
                'total': str(total) if total else None,
                'date': date,
                'confidence': round(avg_confidence * 100, 2),
                'raw_text': full_text
            }
        except Exception as e:
            raise Exception(f"Error extracting structured data: {str(e)}")

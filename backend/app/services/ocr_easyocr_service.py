import os
import easyocr
from PIL import Image
from pdf2image import convert_from_path
import re
from typing import Dict, List, Optional
from decimal import Decimal
import pandas as pd
import numpy as np
import cv2
from .ocr_nlp_utils import OCRNLPUtils


class OCREasyOCRService:
    """Enhanced OCR service using EasyOCR with layout-aware parsing"""

    # Initialize EasyOCR once (expensive operation)
    _reader_instance = None

    @classmethod
    def get_reader_instance(cls):
        """Lazy initialization of EasyOCR Reader"""
        if cls._reader_instance is None:
            try:
                cls._reader_instance = easyocr.Reader(
                    ['en'],  # English language
                    gpu=False,  # Use CPU
                    verbose=False
                )
                print("EasyOCR initialized successfully")
            except Exception as e:
                print(f"Error initializing EasyOCR: {e}")
                import traceback
                traceback.print_exc()
                raise
        return cls._reader_instance

    @staticmethod
    def preprocess_image(image: Image.Image) -> np.ndarray:
        """
        Optimized preprocessing for EasyOCR (neural networks work better with grayscale)

        EasyOCR's neural networks can handle grayscale images with variable lighting
        much better than binary images. Light preprocessing preserves more information.

        Preprocessing steps:
        1. Convert to grayscale
        2. Light denoising
        3. Gentle contrast enhancement (CLAHE instead of histogram equalization)
        4. Slight sharpening to enhance edges
        """
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')

        # Convert PIL to OpenCV
        img_array = np.array(image)

        # Light denoising - preserve text details
        img_array = cv2.fastNlMeansDenoising(img_array, None, h=5, templateWindowSize=7, searchWindowSize=21)

        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # This enhances contrast locally without over-brightening
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img_array = clahe.apply(img_array)

        # Slight sharpening to enhance text edges
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]])
        img_array = cv2.filter2D(img_array, -1, kernel)

        # Ensure values are in valid range
        img_array = np.clip(img_array, 0, 255).astype(np.uint8)

        return img_array

    @staticmethod
    def get_layout_data(image_path: str, file_type: str) -> pd.DataFrame:
        """
        Extract text with detailed layout information using EasyOCR

        Returns DataFrame similar to Tesseract output with columns:
        - text, left, top, width, height, conf
        """
        # Load image
        if file_type.startswith("image/"):
            image = Image.open(image_path)
        elif file_type == "application/pdf":
            images = convert_from_path(image_path)
            image = images[0]  # First page
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        # Get EasyOCR reader
        reader = OCREasyOCRService.get_reader_instance()

        # Apply preprocessing
        img_array = OCREasyOCRService.preprocess_image(image)

        # Save to temp file for EasyOCR
        import tempfile
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        temp_path = temp_file.name
        temp_file.close()

        try:
            # Save preprocessed image
            from PIL import Image as PILImage
            PILImage.fromarray(img_array).save(temp_path)

            # Also save for debugging with a different name
            debug_path = image_path.replace(os.path.splitext(image_path)[1], '_easyocr_preprocessed.png')
            try:
                PILImage.fromarray(img_array).save(debug_path)
                print(f"Saved EasyOCR preprocessed image to: {debug_path}")
            except:
                pass

            # Run EasyOCR - returns list of (bbox, text, confidence)
            print(f"Running EasyOCR on: {temp_path}")
            result = reader.readtext(temp_path)
            print(f"EasyOCR detected {len(result)} text regions")

            # Convert EasyOCR result to DataFrame
            rows = []
            for idx, detection in enumerate(result):
                try:
                    # EasyOCR format: (bbox, text, confidence)
                    # bbox is [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                    bbox = detection[0]
                    text = detection[1]
                    conf = detection[2] * 100  # Convert to 0-100 scale

                    # Calculate bounding box
                    xs = [point[0] for point in bbox]
                    ys = [point[1] for point in bbox]
                    left = int(min(xs))
                    top = int(min(ys))
                    width = int(max(xs) - min(xs))
                    height = int(max(ys) - min(ys))

                    rows.append({
                        'text': text,
                        'left': left,
                        'top': top,
                        'width': width,
                        'height': height,
                        'conf': conf,
                        'line_num': idx,
                        'block_num': 0,
                        'par_num': 0,
                    })
                except Exception as e:
                    print(f"Error processing detection {idx}: {e}")
                    continue

        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass

        df = pd.DataFrame(rows)

        # Filter out low confidence results (matching Tesseract threshold)
        if not df.empty and 'conf' in df.columns:
            df = df[df['conf'] > 30]

        return df

    @staticmethod
    def group_by_lines(df: pd.DataFrame, vertical_threshold: int = 10) -> List[Dict]:
        """
        Group words into lines based on layout data
        Same logic as Tesseract version
        """
        lines = []

        # Check if dataframe is empty or missing required columns
        if df.empty:
            return lines

        required_columns = ["line_num", "text", "left", "top", "width", "height", "conf"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"Warning: EasyOCR DataFrame missing columns: {missing_columns}")
            return lines

        # Group by line_num
        for line_num, group in df.groupby('line_num'):
            if len(group) == 0:
                continue

            line_text = group['text'].iloc[0] if len(group) == 1 else " ".join(group['text'].astype(str).tolist())
            line_text = OCRNLPUtils.clean_ocr_text(line_text)

            lines.append({
                'text': line_text,
                'left': group['left'].min(),
                'top': group['top'].min(),
                'right': group['left'].max() + group.iloc[-1]['width'],
                'bottom': group['top'].max() + group.iloc[-1]['height'],
                'confidence': group['conf'].mean(),
                'words': group[['text', 'left', 'top', 'width', 'height', 'conf']].to_dict('records'),
            })

        # Sort by vertical position (top to bottom)
        lines.sort(key=lambda x: x['top'])

        # Merge lines that are vertically aligned
        merged_lines = []
        i = 0
        while i < len(lines):
            current_line = lines[i]
            j = i + 1

            while j < len(lines):
                next_line = lines[j]
                top_diff = abs(current_line['top'] - next_line['top'])

                if top_diff <= vertical_threshold:
                    # Merge the lines
                    if next_line['left'] < current_line['left']:
                        current_line['text'] = next_line['text'] + " " + current_line['text']
                    else:
                        current_line['text'] = current_line['text'] + " " + next_line['text']

                    current_line['left'] = min(current_line['left'], next_line['left'])
                    current_line['top'] = min(current_line['top'], next_line['top'])
                    current_line['right'] = max(current_line['right'], next_line['right'])
                    current_line['bottom'] = max(current_line['bottom'], next_line['bottom'])
                    current_line['confidence'] = (current_line['confidence'] + next_line['confidence']) / 2
                    current_line['words'].extend(next_line['words'])
                    j += 1
                else:
                    break

            merged_lines.append(current_line)
            i = j if j > i + 1 else i + 1

        return merged_lines

    @staticmethod
    def extract_line_items_with_layout(lines: List[Dict]) -> List[Dict]:
        """
        Extract line items using layout information
        Same logic as Tesseract version for fair comparison
        """
        items = []

        price_patterns = [
            r"(\$\s*\d+[.,]\d{2})",
            r"(\d+[.,]\d{2})",
            r"(\$\s*\d+)\b",
        ]

        for line in lines:
            text = line['text'].strip()

            if len(text) < 3:
                continue
            if text.isdigit() and len(text) > 4:
                continue
            if re.match(r"^[\d\s\-]+$", text):
                continue

            price_match = None
            for pattern in price_patterns:
                match = re.search(pattern, text)
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

                    if 0.50 <= amount < 10000:
                        description = text[:price_match.start()].strip()
                        description = re.sub(r"^[©®™\*\-\•\s]+", "", description)
                        description = re.sub(r"[©®™\*\-\•\s]+$", "", description)
                        description = description.strip()

                        skip_patterns = [
                            r"\b(total|subtotal|tax|balance|change|sold|items|tend|due|card)\b",
                            r"^\d+$",
                            r"^[A-Z]{2,3}\s*\d+",
                        ]

                        should_skip = False
                        for pattern in skip_patterns:
                            if re.search(pattern, text, re.IGNORECASE):
                                should_skip = True
                                break

                        if not should_skip and description and len(description) > 2:
                            items.append({
                                'description': description,
                                'amount': str(amount),
                                'confidence': float(line['confidence']),
                                'position': {
                                    'top': int(line['top']),
                                    'left': int(line['left']),
                                },
                            })
                except:
                    continue

        return items

    @staticmethod
    def find_header_region(lines: List[Dict], top_percent: float = 0.3) -> List[Dict]:
        """Get lines from top portion of receipt"""
        if not lines:
            return []
        max_bottom = max(line['bottom'] for line in lines)
        threshold = max_bottom * top_percent
        return [line for line in lines if line['top'] < threshold]

    @staticmethod
    def find_footer_region(lines: List[Dict], bottom_percent: float = 0.3) -> List[Dict]:
        """Get lines from bottom portion of receipt"""
        if not lines:
            return []
        max_bottom = max(line['bottom'] for line in lines)
        threshold = max_bottom * (1 - bottom_percent)
        return [line for line in lines if line['top'] > threshold]

    @staticmethod
    def parse_receipt_with_easyocr(
        image_path: str, file_type: str, known_vendors: List[str] = []
    ) -> Dict:
        """
        Parse receipt using EasyOCR with same logic as Tesseract version
        """
        # Get layout data
        df = OCREasyOCRService.get_layout_data(image_path, file_type)

        if df.empty:
            return {
                "vendor": None,
                "items": [],
                "total": None,
                "date": None,
                "confidence": 0,
            }

        # Group into lines
        lines = OCREasyOCRService.group_by_lines(df)

        # DEBUG: Log what we detected
        print(f"=== EASYOCR DEBUG ===")
        print(f"Total lines detected: {len(lines)}")
        for i, line in enumerate(lines):
            print(f"Line {i}: '{line['text']}' (conf: {line['confidence']:.1f})")
        print(f"=====================")

        # Get full text
        full_text = "\n".join(line['text'] for line in lines)

        # Find vendor in header region
        header_lines = OCREasyOCRService.find_header_region(lines)
        header_text = "\n".join(line['text'] for line in header_lines)

        vendor = None
        if known_vendors:
            match_result = OCRNLPUtils.fuzzy_match_vendor(
                header_text,
                known_vendors,
                threshold=75,
                context_lines=len(header_lines),
            )
            if match_result:
                vendor = match_result['vendor']

        # Fallback: first substantial line from header
        if not vendor and header_lines:
            for line in header_lines:
                if len(line['text']) > 3 and not re.match(r"^\d+", line['text']):
                    if not re.search(r"\d{3}[-.\s]?\d{3}[-.\s]?\d{4}", line['text']):
                        vendor = line['text']
                        break

        # Extract line items
        items = OCREasyOCRService.extract_line_items_with_layout(lines)
        print(f"EasyOCR extracted items: {items}")

        # Find total in footer
        footer_lines = OCREasyOCRService.find_footer_region(lines)
        total = None
        for line in footer_lines:
            if re.search(r"\btotal\b", line['text'], re.IGNORECASE):
                price_match = re.search(r"\$?\d+[,.]?\d{0,2}", line['text'])
                if price_match:
                    try:
                        total = str(Decimal(price_match.group().replace("$", "").replace(",", ".")))
                        break
                    except:
                        pass

        # Extract date
        date = None
        date_patterns = [
            r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b",
            r"\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b",
        ]
        for pattern in date_patterns:
            match = re.search(pattern, full_text)
            if match:
                groups = match.groups()
                if len(groups[0]) == 4:  # YYYY-MM-DD
                    year, month, day = groups
                else:  # MM/DD/YYYY
                    month, day, year = groups
                    if len(year) == 2:
                        year = f"20{year}"

                try:
                    month_int, day_int = int(month), int(day)
                    if 1 <= month_int <= 12 and 1 <= day_int <= 31:
                        date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                        break
                except:
                    continue

        # Calculate overall confidence
        avg_confidence = sum(line['confidence'] for line in lines) / len(lines) if lines else 0

        return {
            "vendor": vendor,
            "items": items,
            "total": total,
            "date": date,
            "confidence": float(round(avg_confidence, 2)),
            "ocr_engine": "easyocr",
            "layout_info": {
                "total_lines": int(len(lines)),
                "header_lines": int(len(header_lines)),
                "footer_lines": int(len(footer_lines)),
                "detected_items": int(len(items)),
            },
        }

import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import re
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
import pandas as pd
from .ocr_nlp_utils import OCRNLPUtils


class OCRLayoutService:
    """Enhanced OCR service that uses layout information for better receipt parsing"""

    @staticmethod
    def get_layout_data(image_path: str, file_type: str) -> pd.DataFrame:
        """
        Extract text with detailed layout information (bounding boxes, confidence, hierarchy)

        Returns DataFrame with columns:
        - level, page_num, block_num, par_num, line_num, word_num
        - left, top, width, height (bounding box)
        - conf (confidence 0-100)
        - text
        """
        if file_type.startswith('image/'):
            image = Image.open(image_path)
        elif file_type == 'application/pdf':
            images = convert_from_path(image_path)
            image = images[0]  # First page
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        # Preprocess image for better OCR
        from PIL import ImageEnhance, ImageFilter, ImageOps
        import numpy as np
        import cv2

        # Convert to grayscale first
        image = image.convert('L')

        # Convert PIL to OpenCV for advanced preprocessing
        img_array = np.array(image)

        # Upscale if image is small (improves OCR on low-res receipts)
        height, width = img_array.shape
        if width < 1500:
            scale_factor = 1500 / width
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            img_array = cv2.resize(img_array, (new_width, new_height), interpolation=cv2.INTER_CUBIC)

        # Deskew the image (receipts are often rotated)
        def deskew(image):
            coords = np.column_stack(np.where(image > 0))
            if len(coords) == 0:
                return image
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            if abs(angle) > 0.5:  # Only rotate if needed
                (h, w) = image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                image = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            return image

        img_array = deskew(img_array)

        # Denoise
        img_array = cv2.fastNlMeansDenoising(img_array, None, 10, 7, 21)

        # Apply Otsu's binarization (better than adaptive for receipts)
        img_array = cv2.threshold(img_array, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

        # Dilate to connect broken characters
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        img_array = cv2.dilate(img_array, kernel, iterations=1)

        # Convert back to PIL
        image = Image.fromarray(img_array)

        # Use LIGHT preprocessing - aggressive preprocessing loses text
        # Just upscale and grayscale
        light_image = Image.open(image_path) if file_type.startswith('image/') else images[0]
        light_image = light_image.convert('L')

        # Upscale if small
        width, height = light_image.size
        if width < 1500:
            scale_factor = 1500 / width
            new_size = (int(width * scale_factor), int(height * scale_factor))
            light_image = light_image.resize(new_size, Image.LANCZOS)

        # Get detailed layout data as DataFrame using LIGHT preprocessing
        best_data = None
        max_words = 0
        best_psm = None

        for psm in [6, 4, 3]:  # Try different page segmentation modes
            try:
                data = pytesseract.image_to_data(
                    light_image,  # Use lightly processed image
                    output_type=pytesseract.Output.DATAFRAME,
                    config=f'--psm {psm}'
                )
                # Filter valid data
                valid_data = data[data['text'].notna() & (data['conf'] > 0) & (data['conf'] != -1)]

                # Use the mode that detects the most words with good confidence
                word_count = len(valid_data[valid_data['conf'] > 20])  # Lower threshold
                if word_count > max_words:
                    max_words = word_count
                    best_data = data
                    best_psm = psm
            except:
                continue

        if best_data is None:
            raise Exception("OCR failed with all PSM modes")

        print(f"Using PSM mode {best_psm} with {max_words} words (light preprocessing)")
        data = best_data

        # Filter out empty text and low confidence
        data = data[data['text'].notna()]
        data = data[data['conf'] > 0]  # Keep all detections with any confidence
        data = data[data['conf'] != -1]  # Remove invalid confidence scores

        return data

    @staticmethod
    def group_by_lines(df: pd.DataFrame, vertical_threshold: int = 10) -> List[Dict]:
        """
        Group words into lines based on layout data
        Returns list of lines with their text and bounding boxes

        Args:
            df: DataFrame with OCR layout data
            vertical_threshold: Max pixel difference to consider words on same line (default: 10)
        """
        lines = []

        # Group by line_num first
        for (block, par, line), group in df.groupby(['block_num', 'par_num', 'line_num']):
            if len(group) == 0:
                continue

            line_text = ' '.join(group['text'].astype(str).tolist())
            # Apply NLP cleaning to each line
            line_text = OCRNLPUtils.clean_ocr_text(line_text)

            lines.append({
                'text': line_text,
                'left': group['left'].min(),
                'top': group['top'].min(),
                'right': group['left'].max() + group.iloc[-1]['width'],
                'bottom': group['top'].max() + group.iloc[-1]['height'],
                'confidence': group['conf'].mean(),
                'words': group[['text', 'left', 'top', 'width', 'height', 'conf']].to_dict('records')
            })

        # Sort by vertical position (top to bottom)
        lines.sort(key=lambda x: x['top'])

        # Merge lines that are vertically aligned (within threshold)
        # This handles cases where Tesseract splits text on the same line
        merged_lines = []
        i = 0
        while i < len(lines):
            current_line = lines[i]

            # Look ahead to see if next line should be merged
            j = i + 1
            while j < len(lines):
                next_line = lines[j]

                # Check if lines are vertically aligned (similar top position)
                top_diff = abs(current_line['top'] - next_line['top'])

                if top_diff <= vertical_threshold:
                    # Merge the lines
                    # Combine text (sort by horizontal position)
                    if next_line['left'] < current_line['left']:
                        # Next line is to the left, prepend it
                        current_line['text'] = next_line['text'] + ' ' + current_line['text']
                    else:
                        # Next line is to the right, append it
                        current_line['text'] = current_line['text'] + ' ' + next_line['text']

                    # Update bounding box
                    current_line['left'] = min(current_line['left'], next_line['left'])
                    current_line['top'] = min(current_line['top'], next_line['top'])
                    current_line['right'] = max(current_line['right'], next_line['right'])
                    current_line['bottom'] = max(current_line['bottom'], next_line['bottom'])

                    # Average confidence
                    current_line['confidence'] = (current_line['confidence'] + next_line['confidence']) / 2

                    # Merge words lists
                    current_line['words'].extend(next_line['words'])

                    j += 1
                else:
                    # Lines are too far apart vertically, stop merging
                    break

            merged_lines.append(current_line)
            i = j if j > i + 1 else i + 1

        return merged_lines

    @staticmethod
    def detect_columns(lines: List[Dict], threshold: int = 50) -> Dict[str, List[Dict]]:
        """
        Detect if receipt has columns (e.g., description on left, price on right)
        Returns dict with 'left', 'center', 'right' column lines
        """
        if not lines:
            return {'left': [], 'center': [], 'right': []}

        # Get horizontal distribution
        left_positions = [line['left'] for line in lines]
        avg_left = sum(left_positions) / len(left_positions)

        # Simple heuristic: if most text is left-aligned, it's single column
        left_aligned = sum(1 for pos in left_positions if abs(pos - avg_left) < threshold)

        if left_aligned > len(lines) * 0.8:
            # Single column layout
            return {'left': lines, 'center': [], 'right': []}
        else:
            # Multi-column layout - split by horizontal position
            page_width = max(line['right'] for line in lines)

            columns = {'left': [], 'center': [], 'right': []}
            for line in lines:
                center_x = (line['left'] + line['right']) / 2

                if center_x < page_width / 3:
                    columns['left'].append(line)
                elif center_x < 2 * page_width / 3:
                    columns['center'].append(line)
                else:
                    columns['right'].append(line)

            return columns

    @staticmethod
    def find_aligned_pairs(lines: List[Dict], y_threshold: int = 10) -> List[Tuple[Dict, Dict]]:
        """
        Find pairs of text that are horizontally aligned (same Y position)
        Useful for detecting "Item Name      $Price" patterns

        Returns list of (left_line, right_line) tuples
        """
        pairs = []

        for i, line1 in enumerate(lines):
            for line2 in lines[i+1:]:
                # Check if lines are vertically aligned (similar Y position)
                y_diff = abs(line1['top'] - line2['top'])

                if y_diff < y_threshold:
                    # Lines are on same horizontal level
                    if line1['left'] < line2['left']:
                        pairs.append((line1, line2))
                    else:
                        pairs.append((line2, line1))

        return pairs

    @staticmethod
    def extract_line_items_with_layout(lines: List[Dict]) -> List[Dict]:
        """
        Extract line items using layout information
        More accurate than text-only parsing
        """
        items = []

        # More flexible price patterns - handle various formats ANYWHERE in the line
        price_patterns = [
            r'(\$\s*\d+[.,]\d{2})',  # $10.99 or $ 10.99 (anywhere)
            r'(\d+[.,]\d{2})',        # 10.99 (anywhere)
            r'(\$\s*\d+)\b',           # $10 (anywhere, word boundary)
        ]

        for line in lines:
            text = line['text'].strip()

            # Skip lines that are obviously not items
            if len(text) < 3:  # Too short
                continue
            if text.isdigit() and len(text) > 4:  # Long number (like credit card)
                continue
            if re.match(r'^[\d\s\-]+$', text):  # Only numbers, spaces, dashes
                continue

            price_match = None

            # Try each price pattern (anywhere in line)
            for pattern in price_patterns:
                match = re.search(pattern, text)
                if match:
                    price_match = match
                    break

            if price_match:
                price_str = price_match.group(1).replace('$', '').replace(' ', '').replace(',', '.')

                try:
                    amount = Decimal(price_str)

                    # Reasonable price range for line items (at least $0.50)
                    if 0.50 <= amount < 10000:
                        # Extract description - text before the price
                        description = text[:price_match.start()].strip()

                        # Clean up common OCR artifacts from description
                        description = re.sub(r'^[©®™\*\-\•\s]+', '', description)  # Remove leading symbols
                        description = re.sub(r'[©®™\*\-\•\s]+$', '', description)  # Remove trailing symbols
                        description = description.strip()

                        # Filter out total/tax/payment lines and non-items
                        skip_patterns = [
                            r'\b(total|subtotal|tax|balance|change|sold|items|tend|due|card)\b',
                            r'^\d+$',  # Just a number
                            r'^[A-Z]{2,3}\s*\d+',  # Store codes like "STH 01247"
                        ]

                        should_skip = False
                        for pattern in skip_patterns:
                            if re.search(pattern, text, re.IGNORECASE):  # Check full line, not just description
                                should_skip = True
                                break

                        if not should_skip and description and len(description) > 2:  # Must have real description
                            items.append({
                                'description': description,
                                'amount': str(amount),
                                'confidence': float(line['confidence']),  # Convert to Python float
                                'position': {
                                    'top': int(line['top']),  # Convert to Python int
                                    'left': int(line['left'])
                                }
                            })
                except:
                    continue

        return items

    @staticmethod
    def find_header_region(lines: List[Dict], top_percent: float = 0.3) -> List[Dict]:
        """
        Get lines from top portion of receipt (usually contains vendor info)
        """
        if not lines:
            return []

        max_bottom = max(line['bottom'] for line in lines)
        threshold = max_bottom * top_percent

        return [line for line in lines if line['top'] < threshold]

    @staticmethod
    def find_footer_region(lines: List[Dict], bottom_percent: float = 0.3) -> List[Dict]:
        """
        Get lines from bottom portion of receipt (usually contains totals)
        """
        if not lines:
            return []

        max_bottom = max(line['bottom'] for line in lines)
        threshold = max_bottom * (1 - bottom_percent)

        return [line for line in lines if line['top'] > threshold]

    @staticmethod
    def parse_receipt_with_layout(image_path: str, file_type: str, known_vendors: List[str] = []) -> Dict:
        """
        Parse receipt using layout information for better accuracy
        """
        # Get layout data
        df = OCRLayoutService.get_layout_data(image_path, file_type)

        if df.empty:
            return {
                'vendor': None,
                'items': [],
                'total': None,
                'date': None,
                'confidence': 0
            }

        # Group into lines
        lines = OCRLayoutService.group_by_lines(df)

        # DEBUG: Log what we detected
        print(f"=== OCR DEBUG ===")
        print(f"Total lines detected: {len(lines)}")
        for i, line in enumerate(lines):
            print(f"Line {i}: '{line['text']}' (conf: {line['confidence']:.1f})")
        print(f"=================")

        # Get full text for vendor/date detection
        full_text = '\n'.join(line['text'] for line in lines)

        # Find vendor in header region using fuzzy matching
        header_lines = OCRLayoutService.find_header_region(lines)
        header_text = '\n'.join(line['text'] for line in header_lines)

        vendor = None
        if known_vendors:
            # Use fuzzy matching for better accuracy
            match_result = OCRNLPUtils.fuzzy_match_vendor(
                header_text,
                known_vendors,
                threshold=75,
                context_lines=len(header_lines)
            )
            if match_result:
                vendor = match_result['vendor']

        # If no match, take first substantial line from header
        if not vendor and header_lines:
            for line in header_lines:
                # Skip short lines, numbers, addresses
                if len(line['text']) > 3 and not re.match(r'^\d+', line['text']):
                    if not re.search(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', line['text']):
                        vendor = line['text']
                        break

        # Extract line items using layout
        items = OCRLayoutService.extract_line_items_with_layout(lines)
        print(f"Extracted items: {items}")

        # If no items found, try simpler extraction from full text
        if not items:
            print("Layout extraction failed, trying simple text extraction...")
            from app.services.ocr_service import OCRService
            items = OCRService.extract_line_items(full_text)
            print(f"Simple extraction found: {items}")

        # Find total in footer region
        footer_lines = OCRLayoutService.find_footer_region(lines)
        total = None
        for line in footer_lines:
            if re.search(r'\btotal\b', line['text'], re.IGNORECASE):
                price_match = re.search(r'\$?\d+[,.]?\d{0,2}', line['text'])
                if price_match:
                    try:
                        total = str(Decimal(price_match.group().replace('$', '').replace(',', '.')))
                        break
                    except:
                        pass

        # If still no total, try searching all text
        if not total:
            print("Footer total search failed, searching all lines...")
            from app.services.ocr_service import OCRService
            total = OCRService.extract_total(full_text)
            print(f"Total from full text: {total}")

        # Extract date from full text
        date = None
        date_patterns = [
            r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b',
            r'\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b',
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
            'vendor': vendor,
            'items': items,
            'total': total,
            'date': date,
            'confidence': float(round(avg_confidence, 2)),  # Convert to Python float
            'layout_info': {
                'total_lines': int(len(lines)),  # Convert to Python int
                'header_lines': int(len(header_lines)),
                'footer_lines': int(len(footer_lines)),
                'detected_items': int(len(items))
            }
        }

import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import re
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
import pandas as pd


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

        # Get detailed layout data as DataFrame
        # PSM 6 = Assume uniform block of text (good for receipts)
        data = pytesseract.image_to_data(
            image,
            output_type=pytesseract.Output.DATAFRAME,
            config='--psm 6'
        )

        # Filter out empty text and low confidence
        data = data[data['text'].notna()]
        data = data[data['conf'] > 30]  # Only keep confident detections

        return data

    @staticmethod
    def group_by_lines(df: pd.DataFrame) -> List[Dict]:
        """
        Group words into lines based on layout data
        Returns list of lines with their text and bounding boxes
        """
        lines = []

        # Group by line_num
        for (block, par, line), group in df.groupby(['block_num', 'par_num', 'line_num']):
            if len(group) == 0:
                continue

            line_text = ' '.join(group['text'].astype(str).tolist())

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

        return lines

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

        # Price pattern (right-aligned, ends with amount)
        price_pattern = r'\$?\d+[,.]?\d{0,2}\s*$'

        for line in lines:
            text = line['text'].strip()

            # Check if line has a price at the end
            price_match = re.search(price_pattern, text)

            if price_match:
                price_str = price_match.group().replace('$', '').replace(',', '.')

                try:
                    amount = Decimal(price_str)

                    # Reasonable price range for line items
                    if 0 < amount < 10000:
                        description = text[:price_match.start()].strip()

                        # Filter out total/tax lines
                        if not re.search(r'\b(total|subtotal|tax|balance|change)\b', description, re.IGNORECASE):
                            if description:  # Must have description
                                items.append({
                                    'description': description,
                                    'amount': str(amount),
                                    'confidence': line['confidence'],
                                    'position': {
                                        'top': line['top'],
                                        'left': line['left']
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

        # Get full text for vendor/date detection
        full_text = '\n'.join(line['text'] for line in lines)

        # Find vendor in header region
        header_lines = OCRLayoutService.find_header_region(lines)
        header_text = '\n'.join(line['text'] for line in header_lines)

        vendor = None
        for known_vendor in known_vendors:
            if known_vendor.lower() in header_text.lower():
                vendor = known_vendor
                break

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
            'confidence': round(avg_confidence, 2),
            'layout_info': {
                'total_lines': len(lines),
                'header_lines': len(header_lines),
                'footer_lines': len(footer_lines),
                'detected_items': len(items)
            }
        }

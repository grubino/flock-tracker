import os
import easyocr
from PIL import Image
from PIL import Image as PILImage
from pdf2image import convert_from_path
import re
from typing import Dict, List, Optional
from decimal import Decimal
import pandas as pd
import numpy as np
import cv2
from .ocr_nlp_utils import OCRNLPUtils
import tempfile


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
                    ["en"],  # English language
                    detect_network="dbnet18",
                    recog_network="english_g2",
                    gpu=False,  # Use CPU
                    verbose=False,
                )
                print("EasyOCR initialized successfully")
            except Exception as e:
                print(f"Error initializing EasyOCR: {e}")
                import traceback

                traceback.print_exc()
                raise
        return cls._reader_instance

    @staticmethod
    def _calculate_baseline_y(regions: List[Dict], x: float) -> float:
        """
        Calculate the expected y-position on the baseline at a given x-position.
        Uses linear interpolation between leftmost and rightmost region centers.

        Args:
            regions: List of regions on the current line
            x: The x-position to calculate baseline for

        Returns:
            Expected y-position at x
        """
        if len(regions) == 1:
            # Single region, baseline is its vertical center
            return regions[0]["top"] + regions[0]["height"] / 2

        # Sort by horizontal position
        sorted_regs = sorted(regions, key=lambda r: r["left"])

        # Get leftmost and rightmost region centers
        left_reg = sorted_regs[0]
        right_reg = sorted_regs[-1]

        left_x = left_reg["left"] + left_reg["width"] / 2
        left_y = left_reg["top"] + left_reg["height"] / 2

        right_x = right_reg["left"] + right_reg["width"] / 2
        right_y = right_reg["top"] + right_reg["height"] / 2

        # Linear interpolation
        if abs(right_x - left_x) < 1:
            # Nearly vertical, return average
            return (left_y + right_y) / 2

        slope = (right_y - left_y) / (right_x - left_x)
        return left_y + slope * (x - left_x)

    @staticmethod
    def _region_fits_line(
        region: Dict, line_regions: List[Dict], tolerance_ratio: float = 0.4
    ) -> bool:
        """
        Check if a region fits on the baseline defined by existing line regions.

        Args:
            region: The region to test
            line_regions: Regions already on the line
            tolerance_ratio: Maximum deviation as ratio of region height

        Returns:
            True if region fits on the line
        """
        if not line_regions:
            return True

        # Get the center of the candidate region
        region_center_x = region["left"] + region["width"] / 2
        region_center_y = region["top"] + region["height"] / 2

        # Calculate expected y-position on the baseline
        expected_y = OCREasyOCRService._calculate_baseline_y(
            line_regions, region_center_x
        )

        # Calculate tolerance based on region height
        tolerance = region["height"] * tolerance_ratio

        # Check if region center is close to the baseline
        deviation = abs(region_center_y - expected_y)

        return deviation <= tolerance

    @staticmethod
    def _group_regions_into_lines(regions: List[Dict]) -> List[List[Dict]]:
        """
        Group text regions into lines based on baseline fitting.
        Handles receipts with creases or skew by fitting a line through region centers.

        Args:
            regions: List of dicts with 'top', 'bottom', 'left', 'right', 'height' keys

        Returns:
            List of line groups, where each group is a list of regions sorted by horizontal position
        """
        if not regions:
            return []

        # Sort regions by vertical position (top to bottom), then horizontal (left to right)
        sorted_regions = sorted(regions, key=lambda r: (r["top"], r["left"]))

        line_groups = []
        current_line = [sorted_regions[0]]

        for region in sorted_regions[1:]:
            # Check if this region fits on the baseline of the current line
            if OCREasyOCRService._region_fits_line(region, current_line, 0.7):
                # Add to current line
                current_line.append(region)
            else:
                # Start a new line
                # Sort current line by horizontal position (left to right)
                current_line.sort(key=lambda r: r["left"])
                line_groups.append(current_line)
                current_line = [region]

        # Don't forget the last line
        if current_line:
            current_line.sort(key=lambda r: r["left"])
            line_groups.append(current_line)

        return line_groups

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
        if image.mode != "L":
            image = image.convert("L")

        # Convert PIL to OpenCV
        img_array = np.array(image)

        # Light denoising - preserve text details
        img_array = cv2.fastNlMeansDenoising(
            img_array, None, h=5, templateWindowSize=7, searchWindowSize=21
        )

        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # This enhances contrast locally without over-brightening
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img_array = clahe.apply(img_array)

        # Slight sharpening to enhance text edges
        kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
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
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        temp_path = temp_file.name

        try:
            # Save preprocessed image
            PILImage.fromarray(img_array).save(temp_path)

            # Also save for debugging with a different name
            debug_path = image_path.replace(
                os.path.splitext(image_path)[1], "_easyocr_preprocessed.png"
            )
            try:
                PILImage.fromarray(img_array).save(debug_path)
                print(f"Saved EasyOCR preprocessed image to: {debug_path}")
            except:
                pass

            # Run EasyOCR - returns list of (bbox, text, confidence)
            print(f"Running EasyOCR on: {temp_path}")
            result = reader.readtext(temp_path)
            print(f"EasyOCR detected {len(result)} text regions")

            # Convert EasyOCR result to list of regions
            regions = []
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
                    width = int(max(xs) - left)
                    height = int(max(ys) - top)

                    # Filter low confidence immediately
                    if conf > 30:
                        regions.append(
                            {
                                "text": text,
                                "left": left,
                                "right": left + width,
                                "top": top,
                                "width": width,
                                "height": height,
                                "conf": conf,
                                "bottom": top + height,
                            }
                        )
                except Exception as e:
                    print(f"Error processing detection {idx}: {e}")
                    continue

        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass

        # Group regions into lines based on vertical overlap
        line_groups = OCREasyOCRService._group_regions_into_lines(regions)

        # Convert to DataFrame with line numbers
        rows = []
        for line_num, line_regions in enumerate(line_groups):
            for region in line_regions:
                rows.append(
                    {
                        "text": region["text"],
                        "left": region["left"],
                        "top": region["top"],
                        "width": region["width"],
                        "height": region["height"],
                        "conf": region["conf"],
                        "line_num": line_num,
                        "block_num": 0,
                        "par_num": 0,
                    }
                )

        df = pd.DataFrame(rows)
        return df

    @staticmethod
    def group_by_lines(df: pd.DataFrame, vertical_threshold: int = 10) -> List[Dict]:
        """
        Group words into lines based on layout data.

        Lines are already grouped by _group_regions_into_lines in get_layout_data,
        so we just need to combine regions within each line_num group.
        """
        lines = []

        # Check if dataframe is empty or missing required columns
        if df.empty:
            return lines

        required_columns = [
            "line_num",
            "text",
            "left",
            "top",
            "width",
            "height",
            "conf",
        ]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"Warning: EasyOCR DataFrame missing columns: {missing_columns}")
            return lines

        # Group by line_num (regions are already sorted left-to-right within each line)
        for line_num, group in df.groupby("line_num", sort=True):
            if len(group) == 0:
                continue

            # Sort by left position to ensure proper left-to-right order
            group = group.sort_values("left")

            # Combine text from all regions in this line, left to right
            line_text = " ".join(group["text"].astype(str).tolist())
            line_text = OCRNLPUtils.clean_ocr_text(line_text)

            # Calculate the bounding box for the entire line
            left = group["left"].min()
            top = group["top"].min()
            right = (group["left"] + group["width"]).max()
            bottom = (group["top"] + group["height"]).max()

            lines.append(
                {
                    "text": line_text,
                    "left": int(left),
                    "top": int(top),
                    "right": int(right),
                    "bottom": int(bottom),
                    "confidence": float(group["conf"].mean()),
                    "words": group[
                        ["text", "left", "top", "width", "height", "conf"]
                    ].to_dict("records"),
                }
            )

        return lines

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
            text = line["text"].strip()

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
                        description = text[: price_match.start()].strip()
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
                            items.append(
                                {
                                    "description": description,
                                    "amount": str(amount),
                                    "confidence": float(line["confidence"]),
                                    "position": {
                                        "top": int(line["top"]),
                                        "left": int(line["left"]),
                                    },
                                }
                            )
                except:
                    continue

        return items

    @staticmethod
    def find_header_region(lines: List[Dict], top_percent: float = 0.3) -> List[Dict]:
        """Get lines from top portion of receipt"""
        if not lines:
            return []
        max_bottom = max(line["bottom"] for line in lines)
        threshold = max_bottom * top_percent
        return [line for line in lines if line["top"] < threshold]

    @staticmethod
    def find_footer_region(
        lines: List[Dict], bottom_percent: float = 0.3
    ) -> List[Dict]:
        """Get lines from bottom portion of receipt"""
        if not lines:
            return []
        max_bottom = max(line["bottom"] for line in lines)
        threshold = max_bottom * (1 - bottom_percent)
        return [line for line in lines if line["top"] > threshold]

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
        full_text = "\n".join(line["text"] for line in lines)

        # Find vendor in header region
        header_lines = OCREasyOCRService.find_header_region(lines)
        header_text = "\n".join(line["text"] for line in header_lines)

        vendor = None
        if known_vendors:
            match_result = OCRNLPUtils.fuzzy_match_vendor(
                header_text,
                known_vendors,
                threshold=75,
                context_lines=len(header_lines),
            )
            if match_result:
                vendor = match_result["vendor"]

        # Fallback: first substantial line from header
        if not vendor and header_lines:
            for line in header_lines:
                if len(line["text"]) > 3 and not re.match(r"^\d+", line["text"]):
                    if not re.search(r"\d{3}[-.\s]?\d{3}[-.\s]?\d{4}", line["text"]):
                        vendor = line["text"]
                        break

        # Extract line items
        items = OCREasyOCRService.extract_line_items_with_layout(lines)
        print(f"EasyOCR extracted items: {items}")

        # Find total in footer
        footer_lines = OCREasyOCRService.find_footer_region(lines)
        total = None
        for line in footer_lines:
            if re.search(r"\btotal\b", line["text"], re.IGNORECASE):
                price_match = re.search(r"\$?\d+[,.]?\d{0,2}", line["text"])
                if price_match:
                    try:
                        total = str(
                            Decimal(
                                price_match.group().replace("$", "").replace(",", ".")
                            )
                        )
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
        avg_confidence = (
            sum(line["confidence"] for line in lines) / len(lines) if lines else 0
        )

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

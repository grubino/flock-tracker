"""
OCR Service using naver-clova-ix/donut-base-finetuned-cord-v2 model for receipt parsing
Donut is a document understanding transformer optimized for receipts and structured documents
"""

import logging
from typing import Dict, List, Optional
from decimal import Decimal
import re
import os
from PIL import Image
from pdf2image import convert_from_path
import tempfile
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class OCRDonutService:
    """OCR service using Donut model for receipt parsing"""

    _model = None
    _processor = None
    _device = None

    @classmethod
    def _initialize_model(cls):
        """Lazy initialization of Donut model"""
        if cls._model is None:
            try:
                logger.info("Initializing Donut OCR model...")

                # Auto-detect GPU availability and fall back to CPU if needed
                try:
                    has_gpu = torch.cuda.is_available()
                    cls._device = "cuda" if has_gpu else "cpu"
                except:
                    cls._device = "cpu"

                logger.info(f"Initializing Donut OCR with device: {cls._device}")

                # Load the Donut model and processor
                # Using the CORD-finetuned version which is optimized for receipts
                model_name = "naver-clova-ix/donut-base-finetuned-cord-v2"
                cls._processor = DonutProcessor.from_pretrained(model_name)
                cls._model = VisionEncoderDecoderModel.from_pretrained(
                    model_name,
                    torch_dtype=torch.float16 if cls._device == "cuda" else torch.float32
                ).to(cls._device)

                cls._model.eval()

                logger.info("Donut OCR model initialized successfully")
            except ImportError as e:
                logger.error(f"Failed to import required dependencies: {e}")
                logger.error("Install with: pip install transformers torch pillow")
                raise
            except Exception as e:
                logger.error(f"Failed to initialize Donut OCR model: {e}")
                raise

    @classmethod
    def _clean_donut_output(cls, text: str) -> str:
        """
        Clean Donut's special tokens and convert to readable text

        Args:
            text: Raw text with Donut special tokens

        Returns:
            Cleaned, human-readable text
        """
        # Remove task start token
        text = re.sub(r"<s_[^>]+>", "", text, count=1)

        # Convert special tokens to readable format
        # Map Donut's special tokens to more readable separators
        replacements = {
            "<s_menu>": "\n--- ITEMS ---\n",
            "</s_menu>": "\n",
            "<s_nm>": "",
            "</s_nm>": "\n",
            "<s_unitprice>": " ",
            "</s_unitprice>": "",
            "<s_num>": " ",
            "</s_num>": "",
            "<s_cnt>": " ",
            "</s_cnt>": "",
            "<s_price>": " $",
            "</s_price>": "",
            "<s_discountprice>": " Discount: $",
            "</s_discountprice>": "",
            "<sep/>": "\n",
            "<s_sub_total>": "\n--- SUBTOTAL ---\n",
            "</s_sub_total>": "\n",
            "<s_subtotal_price>": "Subtotal: $",
            "</s_subtotal_price>": "",
            "<s_tax_price>": "\nTax: $",
            "</s_tax_price>": "",
            "<s_total>": "\n--- TOTAL ---\n",
            "</s_total>": "\n",
            "<s_total_price>": "Total: ",
            "</s_total_price>": "",
            "<s_creditcardprice>": "\nCard: ",
            "</s_creditcardprice>": "",
            "<s_menuqty_cnt>": "\nItems: ",
            "</s_menuqty_cnt>": "",
        }

        for token, replacement in replacements.items():
            text = text.replace(token, replacement)

        # Remove any remaining unknown special tokens
        text = re.sub(r"<[^>]+>", " ", text)

        # Clean up excessive whitespace
        text = re.sub(r" +", " ", text)
        text = re.sub(r"\n\s*\n\s*\n", "\n\n", text)

        return text.strip()

    @classmethod
    def _json_to_readable_text(cls, json_data: Dict) -> str:
        """
        Convert Donut JSON output to human-readable text

        Args:
            json_data: Parsed JSON from token2json

        Returns:
            Human-readable text representation
        """
        lines = []

        # Extract store/vendor info
        if "store" in json_data:
            store = json_data["store"]
            if isinstance(store, dict):
                if "name" in store:
                    lines.append(store["name"])
                if "address" in store:
                    lines.append(store["address"])
                if "tel" in store:
                    lines.append(f"Tel: {store['tel']}")
            lines.append("")

        # Extract menu/items
        if "menu" in json_data and isinstance(json_data["menu"], list):
            lines.append("--- ITEMS ---")
            for item in json_data["menu"]:
                if isinstance(item, dict):
                    item_line = []
                    if "nm" in item:  # name
                        item_line.append(item["nm"])
                    if "cnt" in item:  # count
                        item_line.append(f"x{item['cnt']}")
                    if "unitprice" in item:
                        item_line.append(f"@${item['unitprice']}")
                    if "price" in item:
                        item_line.append(f"= ${item['price']}")
                    if item_line:
                        lines.append(" ".join(item_line))
            lines.append("")

        # Extract subtotal
        if "sub_total" in json_data:
            subtotal = json_data["sub_total"]
            if isinstance(subtotal, dict):
                lines.append("--- SUBTOTAL ---")
                if "subtotal_price" in subtotal:
                    lines.append(f"Subtotal: ${subtotal['subtotal_price']}")
                if "tax_price" in subtotal:
                    lines.append(f"Tax: ${subtotal['tax_price']}")
                lines.append("")

        # Extract total
        if "total" in json_data:
            total = json_data["total"]
            if isinstance(total, dict):
                lines.append("--- TOTAL ---")
                if "total_price" in total:
                    lines.append(f"Total: ${total['total_price']}")
                if "creditcardprice" in total:
                    lines.append(f"Card: ${total['creditcardprice']}")
                if "menuqty_cnt" in total:
                    lines.append(f"Items: {total['menuqty_cnt']}")

        return "\n".join(lines)

    @classmethod
    def _extract_structured_data_from_json(cls, json_data: Dict, known_vendors: List[str]) -> Dict:
        """
        Extract structured receipt data from Donut JSON output

        Args:
            json_data: Parsed JSON from token2json
            known_vendors: List of known vendor names for matching

        Returns:
            Dictionary with structured receipt data
        """
        result = {"vendor": None, "total": None, "date": None, "items": []}

        # Extract vendor name
        if "store" in json_data and isinstance(json_data["store"], dict):
            vendor = json_data["store"].get("name")
            if vendor:
                result["vendor"] = vendor

            # Try to match against known vendors
            if vendor and known_vendors:
                for known_vendor in known_vendors:
                    if known_vendor.lower() in vendor.lower():
                        result["vendor"] = known_vendor
                        break

        # Extract total
        if "total" in json_data and isinstance(json_data["total"], dict):
            total_price = json_data["total"].get("total_price")
            if total_price:
                try:
                    # Remove $ sign if present
                    total_str = str(total_price).replace("$", "").replace(",", "")
                    result["total"] = str(float(total_str))  # Convert to string for schema compliance
                except (ValueError, TypeError):
                    pass

        # Extract date (if present in store info)
        if "store" in json_data and isinstance(json_data["store"], dict):
            date = json_data["store"].get("date")
            if date:
                result["date"] = date

        # Extract line items
        if "menu" in json_data and isinstance(json_data["menu"], list):
            for item in json_data["menu"]:
                if isinstance(item, dict):
                    description = item.get("nm", "")
                    price = item.get("price")

                    if description and price:
                        try:
                            # Remove $ sign if present
                            price_str = str(price).replace("$", "").replace(",", "")
                            amount = float(price_str)
                            result["items"].append({
                                "description": description,
                                "amount": str(amount)  # Convert to string for schema compliance
                            })
                        except (ValueError, TypeError):
                            pass

        return result

    @classmethod
    def extract_text_from_image(cls, image_path: str, return_json: bool = False):
        """
        Extract text from image using Donut OCR

        Args:
            image_path: Path to the image file
            return_json: If True, returns tuple of (text, json_data), otherwise just text

        Returns:
            Extracted text from Donut OCR, or tuple of (text, json_data) if return_json=True
        """
        cls._initialize_model()

        try:
            logger.info(f"Donut: Processing image {image_path}...")

            # Load and preprocess the image
            image = Image.open(image_path).convert("RGB")

            # Prepare decoder input
            task_prompt = "<s_cord-v2>"
            decoder_input_ids = cls._processor.tokenizer(
                task_prompt, add_special_tokens=False, return_tensors="pt"
            ).input_ids

            # Process the image
            pixel_values = cls._processor(image, return_tensors="pt").pixel_values

            # Move to device and convert to model's dtype
            if cls._device == "cuda":
                pixel_values = pixel_values.to(cls._device, dtype=torch.float16)
            else:
                pixel_values = pixel_values.to(cls._device)
            decoder_input_ids = decoder_input_ids.to(cls._device)

            # Generate text from the image
            with torch.no_grad():
                outputs = cls._model.generate(
                    pixel_values,
                    decoder_input_ids=decoder_input_ids,
                    max_length=cls._model.decoder.config.max_position_embeddings,
                    pad_token_id=cls._processor.tokenizer.pad_token_id,
                    eos_token_id=cls._processor.tokenizer.eos_token_id,
                    use_cache=True,
                    bad_words_ids=[[cls._processor.tokenizer.unk_token_id]],
                    return_dict_in_generate=True,
                )

            # Decode the generated sequence using token2json for structured output
            sequence = cls._processor.batch_decode(outputs.sequences)[0]
            sequence = sequence.replace(cls._processor.tokenizer.eos_token, "").replace(
                cls._processor.tokenizer.pad_token, ""
            )

            # Use token2json to parse the structured output
            parsed_json = None
            try:
                parsed_json = cls._processor.token2json(sequence)
                # Convert JSON to readable text format
                cleaned_text = cls._json_to_readable_text(parsed_json)
            except Exception as e:
                logger.warning(f"Failed to parse JSON, falling back to text cleaning: {e}")
                # Fallback to manual cleaning if token2json fails
                cleaned_text = cls._clean_donut_output(sequence)

            logger.info(f"Donut: Extraction complete, text length: {len(cleaned_text)}")

            if return_json:
                return cleaned_text, parsed_json
            return cleaned_text

        except Exception as e:
            logger.error(f"Error extracting text with Donut: {str(e)}")
            raise

    @classmethod
    def parse_receipt_with_donut(
        cls,
        file_path: str,
        file_type: str,
        known_vendors: List[str] = None,
    ) -> Dict:
        """
        Parse receipt using Donut OCR

        Args:
            file_path: Path to the receipt file
            file_type: MIME type of the file
            known_vendors: List of known vendor names for matching

        Returns:
            Dictionary with extracted receipt data
        """
        if known_vendors is None:
            known_vendors = []

        try:
            # Handle PDF files
            if file_type == "application/pdf":
                logger.info("Converting PDF to image for Donut processing...")
                images = convert_from_path(file_path, first_page=1, last_page=1)
                if not images:
                    raise ValueError("Could not convert PDF to image")

                # Save first page as temporary image
                temp_image = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                images[0].save(temp_image.name, "PNG")
                image_path = temp_image.name
            else:
                image_path = file_path

            # Extract text and JSON using Donut
            raw_text, json_data = cls.extract_text_from_image(image_path, return_json=True)

            # Clean up temp file if we created one
            if file_type == "application/pdf" and image_path != file_path:
                try:
                    os.unlink(image_path)
                except:
                    pass

            # Parse structured data from JSON if available, otherwise fall back to text parsing
            if json_data:
                parsed_data = cls._extract_structured_data_from_json(json_data, known_vendors)
            else:
                parsed_data = cls._parse_text_to_receipt_data(raw_text, known_vendors)

            # Add raw text and OCR engine to the result
            parsed_data["raw_text"] = raw_text
            parsed_data["ocr_engine"] = "donut"

            return parsed_data

        except Exception as e:
            logger.error(f"Error parsing receipt with Donut: {str(e)}", exc_info=True)
            raise

    @classmethod
    def _parse_text_to_receipt_data(
        cls, text: str, known_vendors: List[str]
    ) -> Dict:
        """
        Parse extracted text into structured receipt data

        Args:
            text: Raw text extracted by Donut
            known_vendors: List of known vendor names for matching

        Returns:
            Dictionary with structured receipt data
        """
        # Initialize result structure
        result = {"vendor": None, "total": None, "date": None, "items": []}

        # Donut CORD model outputs JSON-like structure, try to parse it
        try:
            # The output might be structured JSON, attempt to extract fields
            import json

            # Try to parse as JSON first
            try:
                data = json.loads(text)
                if isinstance(data, dict):
                    # Extract vendor/store name
                    if "store" in data:
                        result["vendor"] = data["store"].get("name")
                    elif "menu" in data and isinstance(data["menu"], list):
                        # Sometimes vendor is in menu items
                        pass

                    # Extract total
                    if "total" in data:
                        total_data = data["total"]
                        if isinstance(total_data, dict) and "total_price" in total_data:
                            try:
                                result["total"] = str(float(total_data["total_price"]))  # Convert to string
                            except (ValueError, TypeError):
                                pass

                    # Extract date
                    if "date" in data:
                        result["date"] = data["date"]

                    # Extract line items
                    if "menu" in data and isinstance(data["menu"], list):
                        for item in data["menu"]:
                            if isinstance(item, dict):
                                desc = item.get("nm", "")
                                price = item.get("price", "")
                                if desc and price:
                                    try:
                                        result["items"].append({
                                            "description": desc,
                                            "amount": str(float(price))  # Convert to string
                                        })
                                    except (ValueError, TypeError):
                                        pass

                    return result
            except json.JSONDecodeError:
                # Not valid JSON, fall back to text parsing
                pass
        except Exception as e:
            logger.debug(f"Could not parse Donut output as JSON: {e}")

        # Fallback to regex-based parsing if JSON parsing fails
        # Extract vendor name (look for known vendors first)
        for vendor in known_vendors:
            if vendor.lower() in text.lower():
                result["vendor"] = vendor
                break

        # If no known vendor found, try to extract from first lines
        if not result["vendor"]:
            lines = text.split("\n")
            for line in lines[:5]:  # Check first 5 lines
                line = line.strip()
                if len(line) > 2 and not any(char.isdigit() for char in line):
                    result["vendor"] = line
                    break

        # Extract total amount
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
                    result["total"] = str(float(amount_str))  # Convert to string
                    break
                except ValueError:
                    pass

        # Extract datereceipt
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
            # Look for lines with amounts
            amount_match = re.search(r"\$?\s*(\d+[.,]\d{2})\s*$", line)
            if amount_match:
                amount_str = amount_match.group(1).replace(",", ".")
                try:
                    amount = float(amount_str)
                    # Extract description (everything before the amount)
                    description = line[: amount_match.start()].strip()
                    description = re.sub(r"\s+", " ", description)  # Normalize whitespace

                    if description and len(description) > 1:
                        result["items"].append(
                            {"description": description, "amount": str(amount)}  # Convert to string
                        )
                except ValueError:
                    pass

        return result

"""
LLM-based expense data extraction service
Uses local phi3 model via llama.cpp server to extract structured expense data from OCR text
"""

import logging
import json
import asyncio
from typing import Dict, List, Optional
from decimal import Decimal
from datetime import datetime
from openai import AsyncOpenAI, APIConnectionError, APITimeoutError, APIStatusError

from generated.models import ExpenseCategory

logger = logging.getLogger(__name__)


class LLMExpenseExtractor:
    """Service to extract expense data from OCR text using local LLM"""

    @staticmethod
    async def extract_expense_data_with_retry(
        ocr_text: str,
        llm_url: str = "http://localhost:8080/v1",
        timeout: int = 30,
        max_retries: int = 3,
    ) -> Dict:
        """
        Extract structured expense data from OCR text using local LLM with retry logic

        Args:
            ocr_text: Raw OCR text from receipt
            llm_url: Base URL of the llama.cpp server (OpenAI-compatible API)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts

        Returns:
            Dict with structure:
            {
                "success": bool,
                "data": Dict | None,  # expense data if successful
                "error": str | None,  # error message if failed
                "attempts": int  # number of attempts made
            }
        """
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"LLM extraction attempt {attempt} of {max_retries}")

                # Call the main extraction method
                data = await LLMExpenseExtractor.extract_expense_data(
                    ocr_text=ocr_text, llm_url=llm_url, timeout=timeout
                )

                # Success!
                logger.info(f"LLM extraction succeeded on attempt {attempt}")
                return {
                    "success": True,
                    "data": data,
                    "error": None,
                    "attempts": attempt,
                }

            except APITimeoutError as e:
                last_error = f"LLM request timed out after {timeout}s"
                logger.warning(f"Attempt {attempt} failed: {last_error}")

            except APIConnectionError as e:
                last_error = f"Could not connect to LLM server at {llm_url}"
                logger.warning(f"Attempt {attempt} failed: {last_error}")

            except APIStatusError as e:
                last_error = f"LLM API error: {str(e)}"
                logger.warning(f"Attempt {attempt} failed: {last_error}")

            except ValueError as e:
                # JSON parsing errors
                last_error = f"LLM returned invalid data: {str(e)}"
                logger.warning(f"Attempt {attempt} failed: {last_error}")

            except Exception as e:
                last_error = f"Unexpected error: {str(e)}"
                logger.warning(f"Attempt {attempt} failed: {last_error}")

            # If not last attempt, wait before retrying (exponential backoff)
            if attempt < max_retries:
                wait_time = 2 ** (attempt - 1)  # 1s, 2s, 4s
                logger.info(f"Waiting {wait_time}s before retry...")
                await asyncio.sleep(wait_time)

        # All attempts failed
        logger.error(
            f"LLM extraction failed after {max_retries} attempts: {last_error}"
        )
        return {
            "success": False,
            "data": None,
            "error": last_error,
            "attempts": max_retries,
        }

    @staticmethod
    async def extract_expense_data(
        ocr_text: str,
        llm_url: str = "http://localhost:8080/v1",
        timeout: int = 30,
    ) -> Dict:
        """
        Extract structured expense data from OCR text using local LLM

        Args:
            ocr_text: Raw OCR text from receipt
            llm_url: Base URL of the llama.cpp server (OpenAI-compatible API)
            timeout: Request timeout in seconds

        Returns:
            Dict with expense data in the format:
            {
                "category": str,  # ExpenseCategory enum value
                "description": str,
                "amount": float,
                "expense_date": str,  # ISO format YYYY-MM-DD
                "vendor_name": str,
                "notes": str,
                "line_items": [
                    {
                        "description": str,
                        "category": str,  # optional
                        "quantity": float,  # optional
                        "unit_price": float,  # optional
                        "amount": float
                    }
                ]
            }
        """
        # Build the prompt
        prompt = LLMExpenseExtractor._build_extraction_prompt(ocr_text)

        # Create OpenAI client pointing to local llama.cpp server
        client = AsyncOpenAI(
            base_url=llm_url,
            api_key="not-needed",  # llama.cpp doesn't require an API key
            timeout=timeout,
        )

        try:
            response = await client.chat.completions.create(
                model="local-model",  # llama.cpp ignores this, uses loaded model
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistent extraction
                max_tokens=2048,
                stop=["</json>", "```"],
            )

            # Extract the completion text
            completion_text = response.choices[0].message.content or ""
            logger.debug(f"LLM raw response: {completion_text}")

            # Parse the JSON from the completion
            expense_data = LLMExpenseExtractor._parse_llm_response(completion_text)

            return expense_data

        except APITimeoutError:
            logger.error(f"LLM request timed out after {timeout}s")
            raise
        except APIConnectionError as e:
            logger.error(f"Could not connect to LLM server: {str(e)}")
            raise
        except APIStatusError as e:
            logger.error(f"LLM API error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error extracting expense data with LLM: {str(e)}")
            raise

    @staticmethod
    def _build_extraction_prompt(ocr_text: str) -> str:
        """Build the prompt for the LLM to extract expense data"""

        # Get current date for context
        today = datetime.now().strftime("%Y-%m-%d")
        categories = "\n".join((f"  - {n.value}" for n in ExpenseCategory))
        prompt = f"""You are an AI assistant that extracts structured expense data from receipt text.

Today's date is {today}.

Available expense categories:
{categories}

Extract the following information from the receipt text below:
1. Vendor name ("Unknown" if unclear from context)
2. Expense date (YYYY-MM-DD format, use today's date if not found)
3. Total amount (Ensure that the sum of the line items and tax add up to this amount)
4. Brief description (vendor name + main items)
5. Line items with description, quantity (1 if unspecified), unit_price, category (default: "other"), and amount
6. Any relevant notes

Receipt text:
{ocr_text}

Return ONLY a valid JSON object (no markdown, no explanation) with this structure:
{{
  "vendor_name": "string",
  "expense_date": "YYYY-MM-DD",
  "amount": 0.00,
  "description": "brief description",
  "notes": "any relevant notes or observations",
  "line_items": [
    {{
      "description": "item description",
      "category": "selected from the given list",
      "quantity": 0.00,
      "unit_price": 0.00,
      "amount": 0.00
    }}
  ]
}}

JSON:"""

        return prompt

    @staticmethod
    def _parse_llm_response(response_text: str) -> Dict:
        """
        Parse the LLM response and extract JSON

        Args:
            response_text: Raw text response from LLM

        Returns:
            Parsed expense data dictionary
        """
        # Try to extract JSON from the response
        # The LLM might wrap it in markdown code blocks or add extra text

        # Remove markdown code blocks if present
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        # Find JSON object boundaries
        start_idx = text.find("{")
        end_idx = text.rfind("}") + 1

        if start_idx == -1 or end_idx == 0:
            raise ValueError("No JSON object found in LLM response")

        json_str = text[start_idx:end_idx]

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {json_str}")
            raise ValueError(f"Invalid JSON in LLM response: {str(e)}")

        # Validate and clean the data
        return LLMExpenseExtractor._validate_and_clean(data)

    @staticmethod
    def _validate_and_clean(data: Dict) -> Dict:
        """
        Validate and clean the extracted data

        Args:
            data: Raw extracted data dictionary

        Returns:
            Cleaned and validated data dictionary
        """
        # Define valid categories (lowercase for LLM, will convert to uppercase for database)
        valid_categories = {
            "feed",
            "seed",
            "medication",
            "veterinary",
            "infrastructure",
            "equipment",
            "supplies",
            "utilities",
            "labor",
            "maintenance",
            "other",
        }

        # Ensure required fields exist
        cleaned = {
            "vendor_name": data.get("vendor_name", "Unknown Vendor"),
            "expense_date": data.get(
                "expense_date", datetime.now().strftime("%Y-%m-%d")
            ),
            "amount": float(data.get("amount", 0)),
            "category": data.get("category", "other").lower(),  # Normalize to lowercase first
            "description": data.get("description", ""),
            "notes": data.get("notes", ""),
            "line_items": [],
        }

        # Validate and convert category to uppercase for database
        if cleaned["category"] not in valid_categories:
            logger.warning(f"Invalid category '{cleaned['category']}', using 'other'")
            cleaned["category"] = "OTHER"
        else:
            cleaned["category"] = cleaned["category"].upper()

        # Process line items
        for item in data.get("line_items", []):
            line_item = {
                "description": item.get("description", ""),
                "amount": float(item.get("amount", 0)),
            }

            # Optional fields
            if "category" in item:
                item_category = item["category"].lower() if item["category"] else None
                if item_category and item_category in valid_categories:
                    line_item["category"] = item_category.upper()  # Convert to uppercase for database
            if "quantity" in item and item["quantity"] is not None:
                line_item["quantity"] = float(item["quantity"])
            if "unit_price" in item and item["unit_price"] is not None:
                line_item["unit_price"] = float(item["unit_price"])

            # Only add line items with valid description and amount
            if line_item["description"] and line_item["amount"] > 0:
                cleaned["line_items"].append(line_item)

        return cleaned

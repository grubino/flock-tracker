import re
from typing import Dict, List, Optional
from rapidfuzz import fuzz, process


class OCRNLPUtils:
    """NLP utilities for improving OCR text quality"""

    # Common OCR character confusions
    CHAR_CONFUSIONS = {
        # Number/Letter confusions
        'O': ['0'],
        '0': ['O'],
        'l': ['1', 'I', '|'],
        'I': ['1', 'l', '|'],
        '1': ['l', 'I', '|'],
        'S': ['5', '$'],
        '5': ['S'],
        'B': ['8'],
        '8': ['B'],
        'Z': ['2'],
        '2': ['Z'],
        'G': ['6'],
        '6': ['G'],
        # Special character confusions
        'rn': ['m'],
        'vv': ['w'],
        'ii': ['ü'],
        # Common OCR artifacts
        '|': ['1', 'l', 'I'],
        '!': ['1', 'l'],
    }

    @staticmethod
    def normalize_whitespace(text: str) -> str:
        """Remove extra whitespace and normalize line breaks"""
        # Replace multiple spaces with single space
        text = re.sub(r' +', ' ', text)
        # Replace multiple newlines with single newline
        text = re.sub(r'\n+', '\n', text)
        # Remove spaces at start/end of lines
        text = '\n'.join(line.strip() for line in text.split('\n'))
        return text.strip()

    @staticmethod
    def remove_noise_characters(text: str) -> str:
        """Remove common OCR noise characters"""
        # Remove common OCR artifacts and noise
        noise_patterns = [
            r'[~`@#^*_+=\[\]{}\\|<>]',  # Special chars unlikely in receipts
            r'[\x00-\x1f\x7f-\x9f]',     # Control characters
        ]

        for pattern in noise_patterns:
            text = re.sub(pattern, '', text)

        return text

    @staticmethod
    def fix_broken_words(text: str) -> str:
        """Fix words broken across lines with hyphens"""
        # Match word-hyphen-newline-word pattern
        text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
        return text

    @staticmethod
    def fix_price_formatting(text: str) -> str:
        """Fix common price formatting issues from OCR"""
        lines = text.split('\n')
        fixed_lines = []

        for line in lines:
            # Fix dollar sign spacing: "$ 12.99" -> "$12.99"
            line = re.sub(r'\$\s+(\d+)', r'$\1', line)

            # Fix decimal point spacing: "12. 99" -> "12.99"
            line = re.sub(r'(\d+)\.\s+(\d{2})', r'\1.\2', line)

            # Fix comma in prices (European style): "12,99" -> "12.99" (context-aware)
            # Only if it looks like a price (2 digits after comma, near end of line)
            line = re.sub(r'(\d+),(\d{2})\s*$', r'\1.\2', line)

            # Fix space in numbers: "12 99" -> "12.99" (if at end of line)
            line = re.sub(r'(\d+)\s+(\d{2})\s*$', r'\1.\2', line)

            fixed_lines.append(line)

        return '\n'.join(fixed_lines)

    @staticmethod
    def fix_character_confusions_in_prices(text: str) -> str:
        """
        Fix common character confusions specifically in price contexts
        More conservative than general correction to avoid false positives
        """
        lines = text.split('\n')
        fixed_lines = []

        for line in lines:
            # Fix 'S' confused with '$' at start of price
            # "S12.99" or "S 12.99" -> "$12.99"
            line = re.sub(r'\bS(\s?\d+\.?\d{0,2})\b', r'$\1', line)

            # Fix 'O' confused with '0' in numbers
            # But only in numeric contexts (surrounded by digits)
            line = re.sub(r'(\d)O(\d)', r'\g<1>0\g<2>', line)
            line = re.sub(r'(\d)O\b', r'\g<1>0', line)
            line = re.sub(r'\bO(\d)', r'0\1', line)

            # Fix 'l' or 'I' confused with '1' in numbers
            line = re.sub(r'(\d)[lI](\d)', r'\g<1>1\g<2>', line)
            line = re.sub(r'(\d)[lI]\b', r'\g<1>1', line)

            # Fix '|' confused with '1' in numbers
            line = re.sub(r'(\d)\|(\d)', r'\g<1>1\g<2>', line)

            fixed_lines.append(line)

        return '\n'.join(fixed_lines)

    @staticmethod
    def fix_common_word_confusions(text: str, context: str = 'receipt') -> str:
        """Fix common word-level confusions in receipts"""
        # Common receipt term corrections
        corrections = {
            # Payment/total terms
            r'\bTOTAI\b': 'TOTAL',
            r'\bTOTAL[lI]\b': 'TOTAL',
            r'\bT0TAL\b': 'TOTAL',
            r'\bSUBTOTAI\b': 'SUBTOTAL',
            r'\bSUBT0TAL\b': 'SUBTOTAL',
            r'\bTAX\s+TOTAI\b': 'TAX TOTAL',

            # Common items
            r'\bCHEESE\s+BURGER\b': 'CHEESEBURGER',

            # Quantity
            r'\bQTY\s*[I|l1]\b': 'QTY 1',
        }

        for pattern, replacement in corrections.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

        return text

    @staticmethod
    def clean_ocr_text(text: str) -> str:
        """
        Apply all text cleaning and normalization steps
        This is the main entry point for cleaning OCR output
        """
        # Order matters - apply fixes in logical sequence
        text = OCRNLPUtils.normalize_whitespace(text)
        text = OCRNLPUtils.remove_noise_characters(text)
        text = OCRNLPUtils.fix_broken_words(text)
        text = OCRNLPUtils.fix_price_formatting(text)
        text = OCRNLPUtils.fix_character_confusions_in_prices(text)
        text = OCRNLPUtils.fix_common_word_confusions(text)
        text = OCRNLPUtils.normalize_whitespace(text)  # Final cleanup

        return text

    @staticmethod
    def fuzzy_match_vendor(
        text: str,
        known_vendors: List[str],
        threshold: int = 80,
        context_lines: int = 5
    ) -> Optional[Dict[str, any]]:
        """
        Use fuzzy matching to find vendor name in text

        Args:
            text: OCR text to search
            known_vendors: List of known vendor names
            threshold: Minimum similarity score (0-100)
            context_lines: Number of lines from top to search

        Returns:
            Dict with vendor name, confidence score, and matched text, or None
        """
        if not known_vendors:
            return None

        # Get first few lines (vendor usually at top)
        lines = text.split('\n')[:context_lines]

        best_match = None
        best_score = 0
        matched_line = None

        for line in lines:
            line = line.strip()
            if not line or len(line) < 3:
                continue

            # Try fuzzy matching against all known vendors
            # Using token_set_ratio which handles word order and partial matches well
            for vendor in known_vendors:
                # Try different comparison strategies
                scores = [
                    fuzz.ratio(line.lower(), vendor.lower()),
                    fuzz.partial_ratio(line.lower(), vendor.lower()),
                    fuzz.token_set_ratio(line.lower(), vendor.lower()),
                ]
                score = max(scores)

                if score > best_score and score >= threshold:
                    best_score = score
                    best_match = vendor
                    matched_line = line

        if best_match:
            return {
                'vendor': best_match,
                'confidence': best_score,
                'matched_text': matched_line
            }

        return None

    @staticmethod
    def fuzzy_match_from_list(
        text: str,
        candidates: List[str],
        threshold: int = 80
    ) -> Optional[Dict[str, any]]:
        """
        Generic fuzzy matching against a list of candidates

        Returns:
            Dict with matched text and confidence, or None
        """
        if not candidates:
            return None

        # Use rapidfuzz's process.extractOne for efficient matching
        result = process.extractOne(
            text.lower(),
            [c.lower() for c in candidates],
            scorer=fuzz.token_set_ratio,
            score_cutoff=threshold
        )

        if result:
            matched_text, score, index = result
            return {
                'matched': candidates[index],
                'confidence': score,
                'original_text': text
            }

        return None

    @staticmethod
    def extract_context_around_keyword(
        text: str,
        keyword: str,
        lines_before: int = 1,
        lines_after: int = 1
    ) -> Optional[str]:
        """
        Extract text context around a keyword
        Useful for getting related info near important terms
        """
        lines = text.split('\n')

        for i, line in enumerate(lines):
            if keyword.lower() in line.lower():
                start = max(0, i - lines_before)
                end = min(len(lines), i + lines_after + 1)
                context = '\n'.join(lines[start:end])
                return context

        return None

    @staticmethod
    def detect_section(line: str) -> Optional[str]:
        """
        Detect what section of receipt a line belongs to
        Returns: 'header', 'items', 'footer', or None
        """
        line_lower = line.lower()

        # Header indicators
        if any(term in line_lower for term in ['store', 'restaurant', 'receipt', 'phone', 'address']):
            return 'header'

        # Footer/totals indicators
        if any(term in line_lower for term in ['subtotal', 'tax', 'total', 'amount due', 'balance', 'change']):
            return 'footer'

        # Items section (has price pattern but not a total)
        if re.search(r'\$?\d+\.\d{2}', line) and not re.search(r'(sub)?total|tax', line_lower):
            return 'items'

        return None

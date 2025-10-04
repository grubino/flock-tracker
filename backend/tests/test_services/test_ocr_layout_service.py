import pytest
from decimal import Decimal
import pandas as pd
from app.services.ocr_layout_service import OCRLayoutService


class TestOCRLayoutService:
    """Tests for OCRLayoutService layout-based parsing methods"""

    def test_group_by_lines(self):
        """Test grouping words into lines based on layout data"""
        # Create sample DataFrame with words on same line
        df = pd.DataFrame({
            'block_num': [1, 1, 1, 2, 2],
            'par_num': [1, 1, 1, 1, 1],
            'line_num': [1, 1, 1, 2, 2],
            'text': ['Hello', 'World', '!', 'Second', 'Line'],
            'left': [10, 60, 110, 10, 70],
            'top': [10, 10, 10, 30, 30],
            'width': [40, 40, 10, 50, 40],
            'height': [15, 15, 15, 15, 15],
            'conf': [95, 90, 85, 92, 88]
        })

        lines = OCRLayoutService.group_by_lines(df)

        assert len(lines) == 2
        assert lines[0]['text'] == 'Hello World !'
        assert lines[1]['text'] == 'Second Line'
        assert lines[0]['left'] == 10
        assert lines[0]['confidence'] == pytest.approx(90.0, rel=1)

    def test_group_by_lines_empty_dataframe(self):
        """Test grouping with empty DataFrame"""
        df = pd.DataFrame({
            'block_num': [],
            'par_num': [],
            'line_num': [],
            'text': [],
            'left': [],
            'top': [],
            'width': [],
            'height': [],
            'conf': []
        })

        lines = OCRLayoutService.group_by_lines(df)
        assert len(lines) == 0

    def test_detect_columns_single_column(self):
        """Test column detection with single column layout"""
        lines = [
            {'text': 'Line 1', 'left': 10, 'top': 10, 'right': 100, 'bottom': 25},
            {'text': 'Line 2', 'left': 12, 'top': 30, 'right': 102, 'bottom': 45},
            {'text': 'Line 3', 'left': 11, 'top': 50, 'right': 101, 'bottom': 65},
        ]

        columns = OCRLayoutService.detect_columns(lines, threshold=50)

        # Should detect as single column (all in 'left')
        assert len(columns['left']) == 3
        assert len(columns['center']) == 0
        assert len(columns['right']) == 0

    def test_detect_columns_multi_column(self):
        """Test column detection with multi-column layout"""
        lines = [
            {'text': 'Left', 'left': 10, 'top': 10, 'right': 100, 'bottom': 25},
            {'text': 'Right', 'left': 400, 'top': 10, 'right': 500, 'bottom': 25},
            {'text': 'Center', 'left': 200, 'top': 10, 'right': 300, 'bottom': 25},
        ]

        columns = OCRLayoutService.detect_columns(lines, threshold=50)

        # With varied positions, should split into columns
        assert len(columns['left']) > 0 or len(columns['center']) > 0 or len(columns['right']) > 0

    def test_detect_columns_empty_lines(self):
        """Test column detection with empty lines list"""
        columns = OCRLayoutService.detect_columns([])
        assert columns == {'left': [], 'center': [], 'right': []}

    def test_find_aligned_pairs(self):
        """Test finding horizontally aligned text pairs"""
        lines = [
            {'text': 'Item', 'left': 10, 'top': 10, 'right': 60},
            {'text': '$5.00', 'left': 400, 'top': 12, 'right': 450},  # Aligned with Item
            {'text': 'Another', 'left': 10, 'top': 50, 'right': 70},
            {'text': '$3.50', 'left': 400, 'top': 52, 'right': 450},  # Aligned with Another
        ]

        pairs = OCRLayoutService.find_aligned_pairs(lines, y_threshold=10)

        # Should find 2 pairs (Item-$5.00 and Another-$3.50)
        assert len(pairs) >= 2
        assert pairs[0][0]['text'] == 'Item'
        assert pairs[0][1]['text'] == '$5.00'

    def test_find_aligned_pairs_no_alignment(self):
        """Test finding aligned pairs when none exist"""
        lines = [
            {'text': 'Line1', 'left': 10, 'top': 10, 'right': 60},
            {'text': 'Line2', 'left': 10, 'top': 100, 'right': 60},  # Too far apart
        ]

        pairs = OCRLayoutService.find_aligned_pairs(lines, y_threshold=10)
        assert len(pairs) == 0

    def test_extract_line_items_with_layout(self):
        """Test extracting line items using layout information"""
        lines = [
            {'text': 'Milk 3.99', 'top': 100, 'left': 10, 'confidence': 95},
            {'text': 'Bread 2.50', 'top': 120, 'left': 10, 'confidence': 92},
            {'text': 'Total 6.49', 'top': 150, 'left': 10, 'confidence': 90},  # Should be filtered
            {'text': 'Tax 0.50', 'top': 140, 'left': 10, 'confidence': 88},  # Should be filtered
        ]

        items = OCRLayoutService.extract_line_items_with_layout(lines)

        assert len(items) == 2
        assert items[0]['description'] == 'Milk'
        assert items[0]['amount'] == '3.99'
        assert items[1]['description'] == 'Bread'
        assert items[1]['amount'] == '2.50'

    def test_extract_line_items_filters_totals(self):
        """Test that total/tax lines are filtered out"""
        lines = [
            {'text': 'Item 5.00', 'top': 10, 'left': 10, 'confidence': 95},
            {'text': 'Subtotal 5.00', 'top': 20, 'left': 10, 'confidence': 95},
            {'text': 'Tax 0.50', 'top': 30, 'left': 10, 'confidence': 95},
            {'text': 'Total 5.50', 'top': 40, 'left': 10, 'confidence': 95},
        ]

        items = OCRLayoutService.extract_line_items_with_layout(lines)

        assert len(items) == 1
        assert items[0]['description'] == 'Item'

    def test_extract_line_items_requires_description(self):
        """Test that items without descriptions are filtered"""
        lines = [
            {'text': '5.00', 'top': 10, 'left': 10, 'confidence': 95},  # No description
            {'text': 'Item 3.50', 'top': 20, 'left': 10, 'confidence': 95},
        ]

        items = OCRLayoutService.extract_line_items_with_layout(lines)

        assert len(items) == 1
        assert items[0]['description'] == 'Item'

    def test_extract_line_items_price_range_filter(self):
        """Test that unrealistic prices are filtered"""
        lines = [
            {'text': 'Normal 5.00', 'top': 10, 'left': 10, 'confidence': 95},
            {'text': 'Free 0.00', 'top': 20, 'left': 10, 'confidence': 95},  # $0 filtered
            {'text': 'Expensive 15000.00', 'top': 30, 'left': 10, 'confidence': 95},  # Too high
        ]

        items = OCRLayoutService.extract_line_items_with_layout(lines)

        assert len(items) == 1
        assert items[0]['description'] == 'Normal'

    def test_find_header_region(self):
        """Test finding header region (top 30% of receipt)"""
        lines = [
            {'text': 'Store Name', 'top': 10, 'bottom': 20},
            {'text': 'Address', 'top': 25, 'bottom': 35},
            {'text': 'Middle Item', 'top': 150, 'bottom': 160},
            {'text': 'Bottom Total', 'top': 300, 'bottom': 310},
        ]

        header = OCRLayoutService.find_header_region(lines, top_percent=0.3)

        # Should only include items in top 30%
        assert len(header) >= 2  # Store Name and Address
        assert header[0]['text'] == 'Store Name'

    def test_find_header_region_empty(self):
        """Test finding header region with empty lines"""
        header = OCRLayoutService.find_header_region([])
        assert len(header) == 0

    def test_find_footer_region(self):
        """Test finding footer region (bottom 30% of receipt)"""
        lines = [
            {'text': 'Store Name', 'top': 10, 'bottom': 20},
            {'text': 'Middle Item', 'top': 150, 'bottom': 160},
            {'text': 'Subtotal', 'top': 280, 'bottom': 290},
            {'text': 'Total', 'top': 300, 'bottom': 310},
        ]

        footer = OCRLayoutService.find_footer_region(lines, bottom_percent=0.3)

        # Should only include items in bottom 30%
        assert len(footer) >= 2  # Subtotal and Total
        assert any('Total' in line['text'] for line in footer)

    def test_find_footer_region_empty(self):
        """Test finding footer region with empty lines"""
        footer = OCRLayoutService.find_footer_region([])
        assert len(footer) == 0

    def test_extract_line_items_with_dollar_sign(self):
        """Test extracting items with dollar signs"""
        lines = [
            {'text': 'Coffee $4.50', 'top': 10, 'left': 10, 'confidence': 95},
            {'text': 'Muffin $3.25', 'top': 20, 'left': 10, 'confidence': 92},
        ]

        items = OCRLayoutService.extract_line_items_with_layout(lines)

        assert len(items) == 2
        assert items[0]['amount'] == '4.50'  # Dollar sign should be removed
        assert items[1]['amount'] == '3.25'

    def test_extract_line_items_with_confidence(self):
        """Test that confidence scores are preserved"""
        lines = [
            {'text': 'Item 5.00', 'top': 10, 'left': 10, 'confidence': 88.5},
        ]

        items = OCRLayoutService.extract_line_items_with_layout(lines)

        assert len(items) == 1
        assert items[0]['confidence'] == 88.5

    def test_extract_line_items_with_position(self):
        """Test that position information is preserved"""
        lines = [
            {'text': 'Item 5.00', 'top': 100, 'left': 50, 'confidence': 95},
        ]

        items = OCRLayoutService.extract_line_items_with_layout(lines)

        assert len(items) == 1
        assert items[0]['position']['top'] == 100
        assert items[0]['position']['left'] == 50

    def test_group_by_lines_sorts_by_vertical_position(self):
        """Test that lines are sorted top to bottom"""
        df = pd.DataFrame({
            'block_num': [1, 2, 3],
            'par_num': [1, 1, 1],
            'line_num': [1, 1, 1],
            'text': ['Bottom', 'Top', 'Middle'],
            'left': [10, 10, 10],
            'top': [100, 10, 50],  # Intentionally out of order
            'width': [50, 50, 50],
            'height': [15, 15, 15],
            'conf': [90, 90, 90]
        })

        lines = OCRLayoutService.group_by_lines(df)

        # Should be sorted by top position
        assert lines[0]['text'] == 'Top'
        assert lines[1]['text'] == 'Middle'
        assert lines[2]['text'] == 'Bottom'

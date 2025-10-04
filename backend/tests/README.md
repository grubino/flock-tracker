# Backend Tests

This directory contains unit and integration tests for the Flock Tracker backend.

## Test Results

- ✅ **42 tests passing**
- ⏭️ **1 test skipped** (API health check)
- 📊 **59% code coverage**

### Coverage Highlights
- **OCR Layout Service**: 90% coverage
- **OCR Service**: 82% coverage
- **Models**: 100% coverage
- **Schemas**: 100% coverage

## Setup

Install development dependencies:

```bash
pip install -r requirements-dev.txt
```

## Running Tests

Run all tests:
```bash
pytest
```

Run tests with coverage report:
```bash
pytest --cov=app --cov-report=html
```

Run specific test file:
```bash
pytest tests/test_services/test_ocr_service.py
```

Run tests matching a pattern:
```bash
pytest -k "test_extract"
```

Run tests in verbose mode:
```bash
pytest -v
```

## Coverage Reports

After running tests with coverage, view the HTML report:
```bash
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

## Test Structure

- `tests/conftest.py` - Shared fixtures and test configuration
- `tests/fixtures/` - Test data files (images, PDFs, etc.)
- `tests/test_api/` - API endpoint tests
- `tests/test_services/` - Service layer tests
  - `test_ocr_service.py` - Unit tests for basic OCR parsing (14 tests)
  - `test_ocr_layout_service.py` - Unit tests for layout-based OCR (19 tests)
  - `test_ocr_integration.py` - Integration tests using real images (9 tests)

## Test Fixtures

The `tests/fixtures/` directory contains test data:

- `sample_receipt.jpg` - Generated receipt image for OCR testing
- `create_sample_receipt.py` - Script to regenerate the sample receipt

To regenerate the sample receipt:
```bash
cd tests/fixtures
python create_sample_receipt.py
```

## Writing Tests

Tests use pytest fixtures defined in `conftest.py`:

- `db` - Fresh database session for each test
- `client` - FastAPI TestClient with database override

Example unit test:
```python
def test_extract_total():
    text = "Item 5.00\nTotal: 15.99"
    total = OCRService.extract_total(text)
    assert total == Decimal("15.99")
```

Example integration test:
```python
def test_parse_receipt_from_image():
    result = OCRLayoutService.parse_receipt_with_layout(
        "tests/fixtures/sample_receipt.jpg",
        'image/jpeg',
        known_vendors=["Walmart"]
    )
    assert result['vendor'] == "Walmart"
    assert len(result['items']) > 0
```

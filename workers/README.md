# Flock Tracker Workers

Celery workers for async task processing, primarily for OCR receipt processing.

## Setup

### 1. Install Dependencies

```bash
pip install -r backend/requirements.txt
```

The backend also depends on a `llama.cpp` server which can be started like so:

```bash
$ pushd ../llama.cpp && ./bin/llama-server -m models/Phi-3-mini-4k-instruct-q4.gguf --host 0.0.0.0 --port 8080 -c 8192 & popd
```

You must also set `LLM_URL` appropriately in the environment.  For this example, it would be `LLM_URL=http://localhost:8080/completion` which is the default value.

### 2. Install Tesseract OCR

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr poppler-utils
```

**macOS:**
```bash
brew install tesseract poppler
```

### 3. Configure Redis

Add to your `.env` file:
```
REDIS_URL=redis://localhost:6379/0
```

For Render.com, use their Redis add-on and set the `REDIS_URL` environment variable.

### 4. Run Redis (Local Development)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
sudo apt-get install redis-server
redis-server
```

## Running Workers

### Local Development

From the project root:

```bash
celery -A workers.celery_app worker --loglevel=info
```

### Production (Render.com)

Create a **Background Worker** service on Render with:

**Build Command:**
```bash
pip install -r backend/requirements.txt
apt-get update && apt-get install -y tesseract-ocr poppler-utils
```

**Start Command:**
```bash
celery -A workers.celery_app worker --loglevel=info --concurrency=2
```

**Environment Variables:**
- `REDIS_URL`: From your Redis add-on
- `DATABASE_URL`: Your PostgreSQL connection string

## Tasks

### `process_receipt_ocr`

Processes receipt images/PDFs with OCR and extracts:
- Vendor name
- Line items with descriptions and amounts
- Total amount
- Date

**Usage:**
```python
from workers.tasks import process_receipt_ocr

# Queue task
task = process_receipt_ocr.delay(receipt_id=123)

# Check status
task_id = task.id
```

## Monitoring

### Flower (Task Monitor)

```bash
pip install flower
celery -A workers.celery_app flower
```

Visit http://localhost:5555

### Task States

- `PENDING`: Waiting to be processed
- `PROCESSING`: Currently being processed
- `SUCCESS`: Completed successfully
- `FAILURE`: Failed with error

## Architecture

```
┌─────────────┐      ┌─────────┐      ┌─────────────┐
│   FastAPI   │─────▶│  Redis  │◀─────│   Celery    │
│   Backend   │      │  Broker │      │   Worker    │
└─────────────┘      └─────────┘      └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │  Tesseract  │
                                       │     OCR     │
                                       └─────────────┘
```

## Deployment

### Render.com Setup

1. **Add Redis:** Add a Redis instance from Render dashboard
2. **Web Service:** Your existing FastAPI service
3. **Background Worker:** New service for Celery workers
   - Type: Background Worker
   - Build Command: Install deps + tesseract
   - Start Command: `celery -A workers.celery_app worker`
   - Environment: Same as web service + `REDIS_URL`

### Docker Deployment

See `Dockerfile.worker` for containerized worker deployment.

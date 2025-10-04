FROM python:3.11-slim

# Install system dependencies including Tesseract
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements from backend
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy workers code
COPY workers/ /app/workers/

# Copy backend/app as 'app' subdirectory so imports like 'from app.config' work
COPY backend/app /app/app

# Set PYTHONPATH so Python can find both 'app' and 'workers' modules
ENV PYTHONPATH=/app

# Run Celery worker
CMD ["celery", "-A", "workers.celery_app", "worker", "--loglevel=info", "--concurrency=2"]

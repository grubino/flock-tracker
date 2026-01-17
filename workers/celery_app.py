from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Redis connection URL (configure in your .env file)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery app
celery_app = Celery(
    "flock_tracker_workers",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["workers.tasks"],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # Hard timeout: one hour per task
    task_soft_time_limit=3300,  # Soft timeout: 55 minutes (raises SoftTimeLimitExceeded)
    result_expires=3600,  # Results expire after 1 hour
)

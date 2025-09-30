#!/usr/bin/env python3
"""
Simple migration runner script
"""

import subprocess
import sys
import os
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Run Alembic migrations"""

    logger.info("=== Flock Tracker Database Migration ===")
    logger.info(f"Database URL: {settings.database_url}")

    try:
        # Run alembic upgrade
        logger.info("Running Alembic migrations...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=os.path.dirname(__file__),
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            logger.info("✅ Migrations completed successfully!")
            logger.info("Output:")
            for line in result.stdout.split('\n'):
                if line.strip():
                    logger.info(f"  {line}")
            return True
        else:
            logger.error("❌ Migration failed!")
            logger.error("Error output:")
            for line in result.stderr.split('\n'):
                if line.strip():
                    logger.error(f"  {line}")
            return False

    except Exception as e:
        logger.error(f"Failed to run migrations: {e}")
        return False

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
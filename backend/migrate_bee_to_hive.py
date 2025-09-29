#!/usr/bin/env python3
"""
Migration script to update existing BEE animals to HIVE type.
This should be run once after updating the models.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

def migrate_bee_to_hive():
    """Update any existing animals with type 'bee' to 'hive'"""
    engine = create_engine(settings.database_url)

    with engine.connect() as connection:
        # Check if there are any animals with type 'bee'
        result = connection.execute(
            text("SELECT COUNT(*) FROM animals WHERE animal_type = 'bee'")
        )
        bee_count = result.scalar()

        if bee_count > 0:
            print(f"Found {bee_count} animals with type 'bee'. Updating to 'hive'...")

            # Update bee to hive
            result = connection.execute(
                text("UPDATE animals SET animal_type = 'hive' WHERE animal_type = 'bee'")
            )
            connection.commit()

            print(f"Successfully updated {result.rowcount} animals from 'bee' to 'hive'")
        else:
            print("No animals with type 'bee' found. No migration needed.")

if __name__ == "__main__":
    migrate_bee_to_hive()
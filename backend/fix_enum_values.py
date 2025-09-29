#!/usr/bin/env python3
"""
Fix enum values in the database.

This script fixes animal_type enum values that were stored in lowercase
and converts them to the uppercase format expected by SQLAlchemy.
"""

from app.database.database import engine
from sqlalchemy import text

def fix_enum_values():
    """Fix enum values in the animals table"""

    with engine.connect() as conn:
        print("Checking current enum values...")

        # Check current values
        result = conn.execute(text('SELECT DISTINCT animal_type FROM animals'))
        current_values = [row[0] for row in result]
        print(f"Current animal_type values: {current_values}")

        # Fix lowercase values
        fixes_made = 0

        # Update lowercase 'chicken' to uppercase 'CHICKEN'
        result1 = conn.execute(text('UPDATE animals SET animal_type = "CHICKEN" WHERE animal_type = "chicken"'))
        if result1.rowcount > 0:
            print(f'Updated {result1.rowcount} chicken records from lowercase to uppercase')
            fixes_made += result1.rowcount

        # Update lowercase 'hive' to uppercase 'HIVE'
        result2 = conn.execute(text('UPDATE animals SET animal_type = "HIVE" WHERE animal_type = "hive"'))
        if result2.rowcount > 0:
            print(f'Updated {result2.rowcount} hive records from lowercase to uppercase')
            fixes_made += result2.rowcount

        # Update lowercase 'sheep' to uppercase 'SHEEP' (just in case)
        result3 = conn.execute(text('UPDATE animals SET animal_type = "SHEEP" WHERE animal_type = "sheep"'))
        if result3.rowcount > 0:
            print(f'Updated {result3.rowcount} sheep records from lowercase to uppercase')
            fixes_made += result3.rowcount

        # Commit the changes
        if fixes_made > 0:
            conn.commit()
            print(f'Total records updated: {fixes_made}')
        else:
            print('No enum values needed fixing')

        # Verify the fix
        result = conn.execute(text('SELECT DISTINCT animal_type FROM animals'))
        final_values = [row[0] for row in result]
        print(f"Final animal_type values: {final_values}")

        print("✓ Enum values have been fixed!")

if __name__ == "__main__":
    fix_enum_values()
# Alembic Database Migrations

This project uses Alembic for database schema migrations.

## Quick Start

### For Production Deployment
```bash
python migrate.py
```

### Manual Alembic Commands
```bash
# Run all pending migrations
alembic upgrade head

# Check current migration status
alembic current

# Show migration history
alembic history

# Downgrade one migration
alembic downgrade -1
```

## Creating New Migrations

When you modify models, create a new migration:

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Create empty migration file (for data migrations)
alembic revision -m "Description of changes"
```

## Database Support

The migrations are designed to work with both:
- **SQLite** (local development)
- **PostgreSQL** (production)

## Current Migrations

1. `5ea0f857da65` - Auto-generated initial state
2. `001_initial_role` - Add role column and setup admin user

## Role-Based Access Control

The migration adds a `role` column to the `users` table with three roles:
- `customer` - Read-only access
- `user` - Can create/edit data
- `admin` - Full access including deletes

## Admin User Setup

The migration automatically:
1. Adds the `role` column if it doesn't exist
2. Sets `admin@flocktracker.com` as admin
3. Updates old `admin@flocktracker.local` email if it exists
4. Sets existing users to `user` role (not `customer`)

## Environment Variables

Make sure these are set:
```bash
DATABASE_URL=postgresql://user:password@host:port/database  # or sqlite:///./flock_tracker.db
ADMIN_PASSWORD=your_secure_password
```

## Troubleshooting

### "column users.role does not exist"
Run migrations: `python migrate.py`

### Permission denied on PostgreSQL
Ensure your database user has CREATE and ALTER permissions.

### Migration conflicts
Check `alembic current` and `alembic history` to understand the current state.
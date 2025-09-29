# Admin User Setup

The Flock Tracker API automatically creates an admin user when the server starts up, provided that the `ADMIN_PASSWORD` environment variable is set.

## Configuration

### Environment Variable

Set the `ADMIN_PASSWORD` environment variable to the desired admin password:

```bash
export ADMIN_PASSWORD=your_secure_password_here
```

Or add it to your `.env` file:

```
ADMIN_PASSWORD=your_secure_password_here
```

### Admin User Details

When created, the admin user will have the following properties:

- **Email**: `admin@flocktracker.local`
- **Name**: `Administrator`
- **Username**: Use the email for login
- **Password**: Value from `ADMIN_PASSWORD` environment variable
- **Active**: `true`
- **Verified**: `true` (pre-verified)
- **Provider**: `local`

## Usage

### Starting the Server

1. Set the `ADMIN_PASSWORD` environment variable
2. Start the server normally:

```bash
# Using the run script
python run.py

# Or directly with uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### First Time Setup

When the server starts for the first time with `ADMIN_PASSWORD` set:

1. Database tables are created
2. Admin user is created with the specified password
3. Server starts normally

### Subsequent Startups

On subsequent startups:

1. The system checks if the admin user already exists
2. If it exists, no new user is created
3. If it doesn't exist, a new admin user is created

### Logging In

Use the admin credentials to log in through the API:

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@flocktracker.local",
       "password": "your_secure_password_here"
     }'
```

## Security Considerations

1. **Strong Password**: Use a strong, unique password for the admin account
2. **Environment Variables**: Keep the `ADMIN_PASSWORD` secure and never commit it to version control
3. **Change Default Email**: Consider the email `admin@flocktracker.local` as a known default
4. **Regular Updates**: Consider rotating the admin password regularly

## Troubleshooting

### Admin User Not Created

If the admin user is not created:

1. Check that `ADMIN_PASSWORD` is set and not empty
2. Check the server logs for any error messages
3. Verify database connectivity
4. Ensure the database is writable

### Password Authentication Issues

If login fails:

1. Verify the password matches the `ADMIN_PASSWORD` environment variable
2. Check that the user exists in the database
3. Ensure the user is active and verified

### Logs

The server will log admin user creation status:

- **Success**: `Admin user created/verified: admin@flocktracker.local`
- **Already Exists**: `Admin user already exists`
- **Not Set**: `ADMIN_PASSWORD not set - skipping admin user creation`
- **Error**: `Failed to create admin user: [error details]`